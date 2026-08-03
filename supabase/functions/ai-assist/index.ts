import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders, db, json, requireUser } from '../_shared/db.ts'

const FREE_DAILY_LIMIT = 10

const SYSTEM_PROMPTS: Record<string, string> = {
  idea: `너는 Feedr의 SNS 콘텐츠 어시스턴트다. 사용자의 주제·채널 맥락에 맞는 게시물 아이디어를 제안한다.
아이디어는 5개, 각각 훅(첫 문장) + 한 줄 설명 형식. 한국어로, 실제로 바로 쓸 수 있게 구체적으로.`,
  repurpose: `너는 Feedr의 SNS 콘텐츠 어시스턴트다. 주어진 콘텐츠를 요청된 채널의 형식·톤·길이 관례에 맞게 변환한다.
채널 관례: 인스타그램(캡션+해시태그, 줄바꿈 활용), 틱톡/쇼츠(스크립트, 훅 중심), Threads/X(짧고 대화체), LinkedIn(전문적).
변환 결과만 출력한다. 설명은 붙이지 않는다.`,
  best_time: `너는 Feedr의 SNS 콘텐츠 어시스턴트다. 제공된 채널별 성과 데이터를 근거로 최적 발행 시간을 추천한다.
데이터가 부족하면 플랫폼별 일반 권장 시간대를 제시하되 그렇다고 명시한다. 요일·시간대별로 간결하게.`,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await requireUser(req)
    const { kind, prompt } = await req.json()
    if (!SYSTEM_PROMPTS[kind] || !prompt) return json({ error: 'kind/prompt required' }, 400)

    // 무료 티어 일일 제한 (ai_generations 행 수 기준)
    const { data: profile } = await db.from('profiles').select('plan').eq('id', user.id).single()
    if (profile?.plan === 'free') {
      const since = new Date()
      since.setHours(0, 0, 0, 0)
      const { count } = await db
        .from('ai_generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString())
      if ((count ?? 0) >= FREE_DAILY_LIMIT) {
        return json(
          { error: `무료 플랜은 하루 ${FREE_DAILY_LIMIT}회까지 사용할 수 있어요. Pro로 업그레이드하면 무제한!` },
          429,
        )
      }
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPTS[kind],
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      return json({ error: '이 요청은 처리할 수 없어요. 다른 내용으로 시도해주세요.' }, 400)
    }
    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    await db.from('ai_generations').insert({ user_id: user.id, kind, prompt, response: text })
    return json({ text })
  } catch (e) {
    if (e instanceof Response) return e
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
