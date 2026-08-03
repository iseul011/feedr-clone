import { AuthError } from './types.ts'
import type { Provider, PublishInput, TokenSet } from './types.ts'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

function env(name: string): string {
  return Deno.env.get(name)!
}

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const data = await res.json()
  if (!res.ok) {
    if (data.error === 'invalid_grant') throw new AuthError('invalid_grant')
    throw new Error(`google token error: ${JSON.stringify(data)}`)
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

export const youtube: Provider = {
  id: 'youtube',
  implemented: true,

  authUrl(state, redirectUri) {
    const p = new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
  },

  async exchangeCode(code, redirectUri) {
    const tokens = await tokenRequest({
      code,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    )
    const data = await res.json()
    const ch = data.items?.[0]
    if (!ch) throw new Error('연결할 YouTube 채널이 없습니다')
    return {
      ...tokens,
      accountId: ch.id,
      displayName: ch.snippet.title,
      avatarUrl: ch.snippet.thumbnails?.default?.url,
    }
  },

  async refresh(t) {
    if (!t.refreshToken) throw new AuthError('no refresh token')
    const next = await tokenRequest({
      refresh_token: t.refreshToken,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    })
    return { ...next, refreshToken: next.refreshToken ?? t.refreshToken }
  },

  // resumable videos.insert — ≤3분 세로 영상은 YouTube가 Shorts로 자동 인식
  async publish(t: TokenSet, input: PublishInput) {
    if (input.mediaType !== 'video' || !input.mediaUrl) {
      throw new Error('YouTube는 영상 발행만 지원합니다')
    }
    const start = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: { title: input.title || '(제목 없음)', description: input.body, tags: input.tags },
          status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
        }),
      },
    )
    if (start.status === 401) throw new AuthError('youtube 401')
    if (!start.ok) throw new Error(`youtube init failed: ${await start.text()}`)
    const uploadUrl = start.headers.get('Location')!

    const media = await fetch(input.mediaUrl)
    if (!media.ok || !media.body) throw new Error('media fetch failed')
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Length': media.headers.get('Content-Length') ?? '' },
      body: media.body,
    })
    if (!put.ok) throw new Error(`youtube upload failed: ${await put.text()}`)
    const video = await put.json()
    return {
      providerPostId: video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }
  },

  async fetchChannelStats(t) {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
      { headers: { Authorization: `Bearer ${t.accessToken}` } },
    )
    if (res.status === 401) throw new AuthError('youtube 401')
    const data = await res.json()
    const s = data.items?.[0]?.statistics ?? {}
    return {
      followers: Number(s.subscriberCount ?? 0),
      metrics: {
        views: Number(s.viewCount ?? 0),
        videos: Number(s.videoCount ?? 0),
      },
    }
  },
}
