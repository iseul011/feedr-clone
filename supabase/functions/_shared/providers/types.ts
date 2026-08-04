export type ProviderId =
  | 'youtube'
  | 'threads'
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'linkedin'
  | 'facebook'

export interface TokenSet {
  accessToken: string
  refreshToken?: string
  expiresAt?: string // ISO
}

export interface AccountInfo {
  accountId: string
  displayName: string
  avatarUrl?: string
}

export interface PublishInput {
  title: string
  body: string
  tags: string[]
  mediaUrl?: string // Storage 서명 URL
  mediaType?: 'video' | 'image'
}

export interface PublishResult {
  providerPostId: string
  url?: string
}

export interface Provider {
  id: ProviderId
  implemented: boolean
  authUrl(state: string, redirectUri: string): string
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet & AccountInfo>
  refresh(t: TokenSet): Promise<TokenSet>
  publish(t: TokenSet, input: PublishInput): Promise<PublishResult>
  fetchChannelStats?(t: TokenSet): Promise<{ followers: number; metrics: Record<string, unknown> }>
  // 게시물 단위 인사이트 (조회·좋아요·답글·리포스트·인용·공유)
  fetchPostInsights?(t: TokenSet, providerPostId: string): Promise<Record<string, number>>
}

// 인증 오류(재연동 필요) 표시용 — 러너가 재시도 없이 채널을 expired 처리
export class AuthError extends Error {}
