import { AuthError } from './types.ts'
import type { Provider, PublishInput, TokenSet } from './types.ts'

const GRAPH = 'https://graph.threads.net'

function env(name: string): string {
  return Deno.env.get(name)!
}

async function graphFetch(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH}${path}`, init)
  const data = await res.json()
  if (!res.ok) {
    const err = data as { error?: { code?: number; message?: string } }
    if (err.error?.code === 190) throw new AuthError(err.error.message ?? 'threads auth error')
    throw new Error(`threads api error: ${JSON.stringify(data)}`)
  }
  return data
}

async function pollContainer(containerId: string, accessToken: string): Promise<void> {
  // 영상 컨테이너 처리 대기 (최대 ~2.5분)
  for (let i = 0; i < 30; i++) {
    const data = await graphFetch(
      `/v1.0/${containerId}?fields=status&access_token=${accessToken}`,
    )
    if (data.status === 'FINISHED') return
    if (data.status === 'ERROR') throw new Error('threads container processing failed')
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('threads container timeout')
}

export const threads: Provider = {
  id: 'threads',
  implemented: true,

  authUrl(state, redirectUri) {
    const p = new URLSearchParams({
      client_id: env('THREADS_APP_ID'),
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish,threads_manage_insights',
      response_type: 'code',
      state,
    })
    return `https://threads.net/oauth/authorize?${p}`
  },

  async exchangeCode(code, redirectUri) {
    const short = await graphFetch('/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env('THREADS_APP_ID'),
        client_secret: env('THREADS_APP_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    // 장기 토큰(60일) 교환
    const long = await graphFetch(
      `/access_token?grant_type=th_exchange_token&client_secret=${env('THREADS_APP_SECRET')}&access_token=${short.access_token}`,
    )
    const accessToken = long.access_token as string
    const me = await graphFetch(
      `/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`,
    )
    return {
      accessToken,
      expiresAt: new Date(Date.now() + (long.expires_in as number) * 1000).toISOString(),
      accountId: me.id as string,
      displayName: me.username as string,
      avatarUrl: me.threads_profile_picture_url as string | undefined,
    }
  },

  async refresh(t) {
    const data = await graphFetch(
      `/refresh_access_token?grant_type=th_refresh_token&access_token=${t.accessToken}`,
    )
    return {
      accessToken: data.access_token as string,
      expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000).toISOString(),
    }
  },

  async publish(t: TokenSet, input: PublishInput) {
    const userId = (await graphFetch(`/v1.0/me?fields=id&access_token=${t.accessToken}`)).id
    const text = [input.title, input.body].filter(Boolean).join('\n\n')

    const params = new URLSearchParams({ access_token: t.accessToken, text })
    if (input.mediaType === 'video' && input.mediaUrl) {
      params.set('media_type', 'VIDEO')
      params.set('video_url', input.mediaUrl)
    } else if (input.mediaType === 'image' && input.mediaUrl) {
      params.set('media_type', 'IMAGE')
      params.set('image_url', input.mediaUrl)
    } else {
      params.set('media_type', 'TEXT')
    }

    const container = await graphFetch(`/v1.0/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    const containerId = container.id as string
    if (input.mediaType) await pollContainer(containerId, t.accessToken)

    const published = await graphFetch(`/v1.0/${userId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: t.accessToken, creation_id: containerId }),
    })
    const postId = published.id as string
    return { providerPostId: postId, url: undefined }
  },

  async fetchChannelStats(t) {
    const me = await graphFetch(`/v1.0/me?fields=id&access_token=${t.accessToken}`)
    const now = Math.floor(Date.now() / 1000)
    const since = now - 30 * 86400

    // 누적 참여 지표 (lifetime totals) + 팔로워
    const totals = await graphFetch(
      `/v1.0/${me.id}/threads_insights?metric=followers_count,likes,replies,reposts,quotes&access_token=${t.accessToken}`,
    ).catch(() => ({ data: [] }))
    // 일별 조회수 시계열 (최근 30일) — views는 총계가 아니라 시계열로만 제공된다
    const viewsRes = await graphFetch(
      `/v1.0/${me.id}/threads_insights?metric=views&since=${since}&until=${now}&access_token=${t.accessToken}`,
    ).catch(() => ({ data: [] }))

    const metrics: Record<string, unknown> = {}
    for (const m of (totals.data as { name: string; total_value?: { value: number } }[]) ?? []) {
      metrics[m.name] = m.total_value?.value ?? 0
    }
    const followers = Number(metrics.followers_count ?? 0)
    delete metrics.followers_count

    const series: Record<string, number> = {}
    let viewsTotal = 0
    for (const m of (viewsRes.data as {
      name: string
      values?: { value?: number; end_time?: string }[]
    }[]) ?? []) {
      for (const v of m.values ?? []) {
        const day = String(v.end_time ?? '').slice(0, 10)
        if (!day) continue
        const n = Number(v.value ?? 0)
        series[day] = n
        viewsTotal += n
      }
    }
    metrics.views = viewsTotal // 최근 30일 합계
    metrics.views_series = series // 일별 조회수 (프런트 차트용)
    return { followers, metrics }
  },

  // 게시물 단위 인사이트 — threads_manage_insights 권한 필요
  async fetchPostInsights(t, providerPostId) {
    const data = await graphFetch(
      `/v1.0/${providerPostId}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${t.accessToken}`,
    )
    const out: Record<string, number> = {}
    for (const m of (data.data as {
      name: string
      total_value?: { value: number }
      values?: { value?: number }[]
    }[]) ?? []) {
      out[m.name] = m.total_value?.value ?? m.values?.[0]?.value ?? 0
    }
    return out
  },
}
