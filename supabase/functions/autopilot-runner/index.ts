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
  guidelines: string
  max_posts_per_run: number
}

interface Topic {
  id: string
  title: string
  summary: string
}

// 자기개선 활성 기준 — 이 아래면 배울 재료가 없다고 보고 반성 단계를 건너뛴다
const MIN_PUBLISHED = 3
const MIN_SNAPSHOT_DAYS = 5

const SYSTEM = `너는 SNS 채널 하나를 맡아 스스로 키우는 성장 담당자다.
지표와 과거 성과를 근거로 판단하고, 도구를 써서 실제로 행동한다.

작업 순서:
0. (자기개선) 프롬프트의 누적 데이터가 기준(발행 ${MIN_PUBLISHED}건 이상 그리고 스냅샷 ${MIN_SNAPSHOT_DAYS}일치 이상)을 넘으면:
   지난 행동과 지표 변화를 대조해 record_lesson으로 교훈을 남기고,
   플레이북이 낡았으면 update_playbook으로 전략 전문을 다시 쓴다.
   기준 미달이면 이 단계를 건너뛰고 보고에 그 사실만 한 줄 남긴다.
1. get_analytics와 get_post_history로 채널 상태를 파악한다.
2. web_search로 콘텐츠 지침 범위 안의 최신 트렌드를 조사한다.
   출처가 불확실하거나 검색으로 확인 안 되는 내용은 절대 소재로 쓰지 않는다.
3. 운영 모드에 따라 행동한다:
   - 완전 자율: 조사한 트렌드로 글을 쓰고, 예약 전에 스스로 검수한다
     (지침 위반·사실 오류·페르소나 이탈·중복 소재 확인). 통과한 글만 create_scheduled_post로 예약한다.
   - 승인 필요 + 사용자 지정 주제 있음: 그 주제로만 초안을 작성해 예약한다. 다른 주제를 만들지 않는다.
   - 승인 필요 + 지정 주제 없음: 초안을 만들지 말고, 조사 결과에서 suggest_topics로
     주제 3~5개를 제안하고 끝낸다. 사용자가 골라서 초안을 요청할 것이다.
4. 마지막에 무엇을 왜 했는지 사용자에게 한국어로 짧게 보고한다.

원칙:
- 데이터가 부족하면 그렇다고 말하고, 일반적인 모범 사례를 근거로 삼되 그 사실을 밝힌다.
- 브랜드 페르소나를 일관되게 유지한다. 매번 톤이 바뀌면 채널이 자라지 않는다.
- 콘텐츠 지침이 주어지면 페르소나보다 지침이 우선이다. 지침의 금지사항은 절대 어기지 않는다.
- 플레이북이 있으면 그 전략을 따르되, 지표가 반박하면 플레이북을 고치는 쪽을 택한다.
- 도구가 거부하면 이유를 읽고 조건에 맞게 고쳐서 다시 시도한다.
- 보고는 마케팅 문구가 아니라 사실 위주로. 무엇을 했고 왜 그렇게 판단했는지만 쓴다.`

function buildTools(s: Settings, state: { created: number; actions: unknown[]; runId: string }) {
  const record = (tool: string, input: unknown, result: string) => {
    state.actions.push({ tool, input, result: result.slice(0, 500) })
    return result
  }

  return [
    // Anthropic 서버 실행 웹 검색 — 트렌드 리서치용
    // 기본형(20250305)을 쓴다: 20260209는 내부 코드 실행 컨테이너를 요구해 toolRunner와 안 맞음
    { type: 'web_search_20250305', name: 'web_search', max_uses: 6 },

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
      description: '이 채널에 발행 완료된 과거 글과 결과를 최근순으로 가져온다. 소재 중복 확인과 성과 비교에 쓴다.',
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
      description: '이 채널에서 아직 발행되지 않은 예약 목록을 가져온다. 시각을 옮기거나 소재 중복을 피할 때 확인용으로 쓴다.',
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
    betaTool({
      name: 'suggest_topics',
      description:
        '승인 모드에서 초안 대신 주제를 제안한다. 사용자가 이 중에서 골라 초안 작성을 요청한다. 리서치로 확인된 트렌드만 제안할 것.',
      inputSchema: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '주제 한 줄' },
                summary: { type: 'string', description: '이 주제로 뭘 쓸지 2~3문장 + 근거(어디서 확인했는지)' },
              },
              required: ['title', 'summary'],
              additionalProperties: false,
            },
          },
        },
        required: ['topics'],
        additionalProperties: false,
      },
      run: async ({ topics }) => {
        const rows = (topics as { title: string; summary: string }[]).slice(0, 5).map((t) => ({
          channel_id: s.channel_id,
          user_id: s.user_id,
          run_id: state.runId,
          title: t.title,
          summary: t.summary,
        }))
        const { error } = await db.from('topic_suggestions').insert(rows)
        if (error) return record('suggest_topics', topics, `저장 실패: ${error.message}`)
        return record('suggest_topics', topics, `주제 ${rows.length}개를 제안했다. 사용자 선택을 기다린다.`)
      },
    }),
    betaTool({
      name: 'record_lesson',
      description:
        '지난 행동과 지표 변화를 대조해 얻은 교훈을 한 건 기록한다. 다음 사이클 프롬프트에 주입된다. 데이터로 뒷받침되는 교훈만 기록할 것.',
      inputSchema: {
        type: 'object',
        properties: {
          lesson: { type: 'string', description: '교훈 한두 문장 + 근거가 된 수치' },
        },
        required: ['lesson'],
        additionalProperties: false,
      },
      run: async ({ lesson }) => {
        const { error } = await db.from('agent_experiences').insert({
          channel_id: s.channel_id,
          user_id: s.user_id,
          run_id: state.runId,
          lesson,
        })
        if (error) return record('record_lesson', { lesson }, `기록 실패: ${error.message}`)
        return record('record_lesson', { lesson }, '교훈을 기록했다.')
      },
    }),
    betaTool({
      name: 'update_playbook',
      description:
        '채널 전략 플레이북 전문을 다시 쓴다(새 버전으로 저장, 이전 버전 보존). 교훈이 쌓여 기존 전략과 어긋날 때만 쓸 것.',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '플레이북 전문 (markdown): 타깃, 소재 우선순위, 발행 시간대, 톤, 피할 것' },
        },
        required: ['content'],
        additionalProperties: false,
      },
      run: async ({ content }) => {
        const { data: latest } = await db
          .from('agent_playbooks')
          .select('version')
          .eq('channel_id', s.channel_id)
          .order('version', { ascending: false })
          .limit(1)
        const version = (latest?.[0]?.version ?? 0) + 1
        const { error } = await db.from('agent_playbooks').insert({
          channel_id: s.channel_id,
          user_id: s.user_id,
          version,
          content,
        })
        if (error) return record('update_playbook', { content }, `저장 실패: ${error.message}`)
        return record('update_playbook', { content }, `플레이북 v${version}으로 갱신했다.`)
      },
    }),
  ]
}

// 사이클 간 기억: 플레이북·교훈·누적 데이터 현황을 프롬프트에 주입한다
async function loadMemory(channelId: string) {
  const [{ data: playbook }, { data: lessons }, { count: published }, { data: snaps }] =
    await Promise.all([
      db
        .from('agent_playbooks')
        .select('version, content')
        .eq('channel_id', channelId)
        .order('version', { ascending: false })
        .limit(1),
      db
        .from('agent_experiences')
        .select('lesson, created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(5),
      db
        .from('post_targets')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .eq('status', 'published'),
      db.from('analytics_snapshots').select('captured_at').eq('channel_id', channelId),
    ])
  return {
    playbook: playbook?.[0] ?? null,
    lessons: lessons ?? [],
    publishedCount: published ?? 0,
    snapshotDays: new Set((snaps ?? []).map((r) => r.captured_at)).size,
  }
}

async function runForChannel(s: Settings, topic: Topic | null): Promise<string> {
  const { data: run } = await db
    .from('autopilot_runs')
    .insert({ channel_id: s.channel_id, user_id: s.user_id })
    .select('id')
    .single()
  const runId = run!.id as string

  const state = { created: 0, actions: [] as unknown[], runId }
  try {
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const tools = buildTools(s, state)
    const memory = await loadMemory(s.channel_id)

    const brand = s.brand_name || '(이름 미지정)'
    const persona = s.persona || '(페르소나 미지정 — 일반적인 톤으로 진행)'
    const prompt = `브랜드: ${brand}
페르소나: ${persona}
운영 모드: ${s.mode === 'auto' ? '완전 자율 (예약이 그대로 발행된다)' : '승인 필요 (사람이 검토 후 발행한다)'}
이번 실행에서 새로 만들 수 있는 글: 최대 ${s.max_posts_per_run}개
현재 시각: ${new Date().toISOString()}
${s.guidelines ? `\n콘텐츠 지침 (반드시 따를 것):\n${s.guidelines}\n` : ''}
누적 데이터: 발행 ${memory.publishedCount}건, 지표 스냅샷 ${memory.snapshotDays}일치
${
      memory.playbook
        ? `\n전략 플레이북 v${memory.playbook.version}:\n${memory.playbook.content}\n`
        : '\n전략 플레이북: 아직 없음\n'
    }${
      memory.lessons.length
        ? `최근 교훈:\n${memory.lessons.map((l) => `- ${l.lesson}`).join('\n')}\n`
        : ''
    }${
      topic
        ? `\n사용자가 지정한 주제: ${topic.title}\n주제 설명: ${topic.summary}\n이 주제로만 초안을 작성해 예약하라.\n`
        : ''
    }
지표를 확인하고, 판단하고, 행동한 뒤 보고해라.`

    const runner = anthropic.beta.messages.toolRunner({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system: SYSTEM,
      tools,
      max_iterations: 30, // 폭주 방지
      messages: [{ role: 'user', content: prompt }],
    })

    // 서버 도구(웹 검색)가 pause_turn으로 멈추면 이어서 재개한다
    // deno-lint-ignore no-explicit-any
    let message: any = null
    for await (const m of runner) {
      message = m
      if (m.stop_reason === 'pause_turn') {
        runner.pushMessages({ role: 'assistant', content: m.content })
      }
    }
    if (!message) throw new Error('에이전트가 응답하지 않았습니다')

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

// 진입점: 크론(body 없음 → 채널별 자기호출로 분산) / 내부 자기호출(channel_id + internal_key)
//        / 앱 버튼(channel_id) / 주제 지정 초안(channel_id + topic_id)
// 한 실행이 2~4분이라 여러 채널을 한 요청에서 순차 실행하면 벽시계 한도(~400초)에 걸린다.
// 크론은 채널마다 별도 호출을 쏘고 즉시 응답한다 — 각 채널이 자기 한도를 온전히 쓴다.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const channelId = body?.channel_id as string | undefined
    const topicId = body?.topic_id as string | undefined
    const internalKey = body?.internal_key as string | undefined

    if (channelId) {
      let settingsQuery = db.from('autopilot_settings').select('*').eq('channel_id', channelId)
      if (internalKey === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
        // 크론의 자기호출 — 유저 검증 생략 (서비스 키를 아는 쪽만 가능)
      } else {
        const user = await requireUser(req)
        settingsQuery = settingsQuery.eq('user_id', user.id) // 남의 채널을 돌릴 수 없다
      }
      const { data: settings } = await settingsQuery.single()
      if (!settings) return json({ error: '오토파일럿 설정을 찾을 수 없습니다' }, 404)

      let topic: Topic | null = null
      if (topicId) {
        const { data: t } = await db
          .from('topic_suggestions')
          .select('id, title, summary')
          .eq('id', topicId)
          .eq('channel_id', channelId)
          .eq('status', 'suggested')
          .single()
        if (!t) return json({ error: '해당 주제 제안을 찾을 수 없습니다' }, 404)
        topic = t as Topic
      }

      const runId = await runForChannel(settings as Settings, topic)
      if (topic) {
        await db.from('topic_suggestions').update({ status: 'drafted' }).eq('id', topic.id)
      }
      return json({ run_id: runId })
    }

    // 크론 경로 — 채널별 자기호출 (응답은 기다리지 않는다)
    const { data: all } = await db.from('autopilot_settings').select('channel_id').eq('enabled', true)
    const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/autopilot-runner`
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    for (const s of all ?? []) {
      const dispatch = fetch(selfUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ channel_id: s.channel_id, internal_key: serviceKey }),
      }).catch(() => {}) // fire-and-forget — 결과는 autopilot_runs에 기록된다
      // 응답 반환 후에도 디스패치 요청이 끊기지 않게 유지 (Supabase Edge 런타임)
      ;(globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
        .EdgeRuntime?.waitUntil?.(dispatch)
    }
    return json({ dispatched: (all ?? []).length })
  } catch (e) {
    if (e instanceof Response) return e
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
