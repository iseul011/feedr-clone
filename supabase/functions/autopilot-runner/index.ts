import Anthropic from 'npm:@anthropic-ai/sdk'
import { betaTool } from 'npm:@anthropic-ai/sdk/helpers/beta/json-schema'
import { corsHeaders, db, json, requireUser } from '../_shared/db.ts'
import { checkPostQuota, checkScheduledAt } from '../_shared/autopilot.ts'

interface Settings {
  channel_id: string
  user_id: string
  mode: 'approve' | 'auto'
  brand_name: string
  persona: string
  max_posts_per_run: number
}

const SYSTEM = `너는 SNS 채널 하나를 맡아 스스로 키우는 성장 담당자다.
지표와 과거 성과를 근거로 판단하고, 도구를 써서 실제로 행동한다.

작업 순서:
1. get_analytics로 최근 성장 추이를 본다.
2. get_post_history로 어떤 글이 잘 됐는지 확인한다.
3. 근거가 모이면 행동한다 — 새 글을 예약(create_scheduled_post)하거나,
   이미 잡힌 예약의 시각을 더 나은 시간대로 옮긴다(reschedule_target).
   성과가 좋았던 글은 각도를 바꿔 다시 써도 좋다.
4. 마지막에 무엇을 왜 했는지 사용자에게 한국어로 짧게 보고한다.

원칙:
- 데이터가 부족하면 그렇다고 말하고, 일반적인 모범 사례를 근거로 삼되 그 사실을 밝힌다.
- 브랜드 페르소나를 일관되게 유지한다. 매번 톤이 바뀌면 채널이 자라지 않는다.
- 도구가 거부하면 이유를 읽고 조건에 맞게 고쳐서 다시 시도한다.
- 보고는 마케팅 문구가 아니라 사실 위주로. 무엇을 했고 왜 그렇게 판단했는지만 쓴다.`

function buildTools(s: Settings, state: { created: number; actions: unknown[] }) {
  const record = (tool: string, input: unknown, result: string) => {
    state.actions.push({ tool, input, result: result.slice(0, 500) })
    return result
  }

  return [
    betaTool({
      name: 'get_analytics',
      description: '이 채널의 최근 일별 통계 스냅샷(팔로워, 조회수 등)과 채널 정보를 가져온다.',
      inputSchema: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: '조회할 일수 (기본 14)' },
        },
      },
      run: async ({ days = 14 }) => {
        const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
        const [{ data: channel }, { data: snapshots }] = await Promise.all([
          db.from('channels').select('provider, display_name').eq('id', s.channel_id).single(),
          db
            .from('analytics_snapshots')
            .select('captured_at, followers, metrics')
            .eq('channel_id', s.channel_id)
            .gte('captured_at', since)
            .order('captured_at', { ascending: true }),
        ])
        return record(
          'get_analytics',
          { days },
          JSON.stringify({ channel, snapshots: snapshots ?? [] }),
        )
      },
    }),
    betaTool({
      name: 'get_post_history',
      description: '이 채널에 발행 완료된 과거 글과 결과를 최근순으로 가져온다. 재활용할 소재를 찾을 때 쓴다.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: '가져올 개수 (기본 20)' },
        },
      },
      run: async ({ limit = 20 }) => {
        const { data } = await db
          .from('post_targets')
          .select('published_at, provider_url, posts(title, body, tags)')
          .eq('channel_id', s.channel_id)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(limit)
        return record('get_post_history', { limit }, JSON.stringify(data ?? []))
      },
    }),
    betaTool({
      name: 'create_scheduled_post',
      description:
        '새 글을 작성해 이 채널에 예약한다. 텍스트 전용이며 미디어는 첨부할 수 없다. 예약은 지금부터 최소 30분 뒤여야 한다.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '제목 (Threads는 본문 앞에 붙는다)' },
          body: { type: 'string', description: '본문' },
          tags: { type: 'array', items: { type: 'string' }, description: '태그 목록' },
          scheduled_at: { type: 'string', description: '발행 예약 시각 (ISO 8601)' },
        },
        required: ['body', 'scheduled_at'],
        additionalProperties: false,
      },
      run: async (input) => {
        const quotaErr = checkPostQuota(state.created, s.max_posts_per_run)
        if (quotaErr) return record('create_scheduled_post', input, quotaErr)
        const timeErr = checkScheduledAt(input.scheduled_at)
        if (timeErr) return record('create_scheduled_post', input, timeErr)

        const { data: post, error: postErr } = await db
          .from('posts')
          .insert({
            user_id: s.user_id,
            title: input.title ?? '',
            body: input.body,
            tags: input.tags ?? [],
          })
          .select('id')
          .single()
        if (postErr) return record('create_scheduled_post', input, `글 저장 실패: ${postErr.message}`)

        // 승인 모드면 draft로 두고 사람이 큐에서 승인해야 발행된다
        const status = s.mode === 'auto' ? 'queued' : 'draft'
        const { error: targetErr } = await db.from('post_targets').insert({
          post_id: post.id,
          channel_id: s.channel_id,
          scheduled_at: input.scheduled_at,
          status,
        })
        if (targetErr) {
          return record('create_scheduled_post', input, `예약 실패: ${targetErr.message}`)
        }

        state.created++
        return record(
          'create_scheduled_post',
          input,
          status === 'queued'
            ? `예약 완료(${input.scheduled_at}). 시각이 되면 자동 발행된다.`
            : `초안으로 저장했다(${input.scheduled_at}). 사용자가 대기열에서 승인해야 발행된다.`,
        )
      },
    }),
    betaTool({
      name: 'reschedule_target',
      description:
        '이 채널에 이미 예약된 글의 발행 시각을 옮긴다. 대상 id는 get_pending_targets로 얻는다.',
      inputSchema: {
        type: 'object',
        properties: {
          target_id: { type: 'string', description: '예약 항목 id' },
          scheduled_at: { type: 'string', description: '새 발행 시각 (ISO 8601)' },
        },
        required: ['target_id', 'scheduled_at'],
        additionalProperties: false,
      },
      run: async (input) => {
        const timeErr = checkScheduledAt(input.scheduled_at)
        if (timeErr) return record('reschedule_target', input, timeErr)
        const { data, error } = await db
          .from('post_targets')
          .update({ scheduled_at: input.scheduled_at })
          .eq('id', input.target_id)
          .eq('channel_id', s.channel_id) // 다른 채널 항목은 건드릴 수 없다
          .in('status', ['queued', 'draft'])
          .select('id')
        if (error) return record('reschedule_target', input, `변경 실패: ${error.message}`)
        if (!data?.length) {
          return record(
            'reschedule_target',
            input,
            '해당 예약을 찾을 수 없다. 이 채널의 발행 전 항목만 옮길 수 있다.',
          )
        }
        return record('reschedule_target', input, `${input.scheduled_at}로 옮겼다.`)
      },
    }),
    betaTool({
      name: 'get_pending_targets',
      description: '이 채널에서 아직 발행되지 않은 예약 목록을 가져온다. 시각을 옮기기 전에 확인용으로 쓴다.',
      inputSchema: { type: 'object', properties: {} },
      run: async () => {
        const { data } = await db
          .from('post_targets')
          .select('id, scheduled_at, status, posts(title, body)')
          .eq('channel_id', s.channel_id)
          .in('status', ['queued', 'draft'])
          .order('scheduled_at', { ascending: true })
        return record('get_pending_targets', {}, JSON.stringify(data ?? []))
      },
    }),
  ]
}

async function runForChannel(s: Settings): Promise<string> {
  const { data: run } = await db
    .from('autopilot_runs')
    .insert({ channel_id: s.channel_id, user_id: s.user_id })
    .select('id')
    .single()
  const runId = run!.id as string

  const state = { created: 0, actions: [] as unknown[] }
  try {
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const tools = buildTools(s, state)

    const brand = s.brand_name || '(이름 미지정)'
    const persona = s.persona || '(페르소나 미지정 — 일반적인 톤으로 진행)'
    const prompt = `브랜드: ${brand}
페르소나: ${persona}
운영 모드: ${s.mode === 'auto' ? '완전 자율 (예약이 그대로 발행된다)' : '승인 필요 (사람이 검토 후 발행한다)'}
이번 실행에서 새로 만들 수 있는 글: 최대 ${s.max_posts_per_run}개
현재 시각: ${new Date().toISOString()}

지표를 확인하고, 판단하고, 행동한 뒤 보고해라.`

    const message = await anthropic.beta.messages.toolRunner({
      model: 'claude-opus-5',
      max_tokens: 8192,
      system: SYSTEM,
      tools,
      max_iterations: 20, // 폭주 방지
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      throw new Error('요청이 안전 정책으로 거부되었습니다. 페르소나 설정을 확인해주세요.')
    }
    const report = message.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    await db
      .from('autopilot_runs')
      .update({
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        report,
        actions: state.actions,
      })
      .eq('id', runId)
    return runId
  } catch (e) {
    await db
      .from('autopilot_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        actions: state.actions,
        error: e instanceof Error ? e.message : String(e),
      })
      .eq('id', runId)
    throw e
  }
}

// 진입점 두 개: 크론(body 없음 → enabled 전 채널) / 앱 버튼(body.channel_id → 해당 채널만)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const channelId = body?.channel_id as string | undefined

    if (channelId) {
      const user = await requireUser(req)
      const { data: settings } = await db
        .from('autopilot_settings')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id) // 남의 채널을 돌릴 수 없다
        .single()
      if (!settings) return json({ error: '오토파일럿 설정을 찾을 수 없습니다' }, 404)
      const runId = await runForChannel(settings as Settings)
      return json({ run_id: runId })
    }

    // 크론 경로
    const { data: all } = await db.from('autopilot_settings').select('*').eq('enabled', true)
    const results: Record<string, string> = {}
    for (const s of (all ?? []) as Settings[]) {
      try {
        results[s.channel_id] = await runForChannel(s)
      } catch (e) {
        // 한 채널 실패가 나머지를 막지 않는다
        results[s.channel_id] = `failed: ${e instanceof Error ? e.message : String(e)}`
      }
    }
    return json({ ran: Object.keys(results).length, results })
  } catch (e) {
    if (e instanceof Response) return e
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
