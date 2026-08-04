export type ProviderId =
  | 'youtube'
  | 'threads'
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'linkedin'
  | 'facebook'

export const IMPLEMENTED_PROVIDERS: ProviderId[] = ['youtube', 'threads']

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  youtube: 'YouTube Shorts',
  threads: 'Threads',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
}

export interface Channel {
  id: string
  provider: ProviderId
  provider_account_id: string
  display_name: string
  avatar_url: string | null
  status: 'connected' | 'expired' | 'revoked'
  color: string
  created_at: string
}

export interface Post {
  id: string
  title: string
  body: string
  tags: string[]
  media_path: string | null
  media_type: 'video' | 'image' | null
  created_at: string
}

export type TargetStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'failed' | 'canceled'

export interface PostTarget {
  id: string
  post_id: string
  channel_id: string
  scheduled_at: string
  status: TargetStatus
  attempt_count: number
  published_at: string | null
  provider_url: string | null
  error_message: string | null
  created_at: string
}

export interface ChannelMetrics {
  views?: number // 최근 30일 조회 합계
  likes?: number // 누적
  replies?: number
  reposts?: number
  quotes?: number
  views_series?: Record<string, number> // 일별 조회수 (YYYY-MM-DD → n)
}

export interface AnalyticsSnapshot {
  channel_id: string
  captured_at: string
  followers: number
  metrics: ChannelMetrics
}

export interface PostInsight {
  target_id: string
  channel_id: string
  captured_at: string
  views: number
  likes: number
  replies: number
  reposts: number
  quotes: number
  shares: number
}

export interface AutopilotSettings {
  channel_id: string
  user_id: string
  enabled: boolean
  mode: 'approve' | 'auto'
  brand_name: string
  persona: string
  guidelines: string
  max_posts_per_run: number
  updated_at: string
}

export interface AutopilotRun {
  id: string
  channel_id: string
  user_id: string
  started_at: string
  finished_at: string | null
  status: 'running' | 'succeeded' | 'failed'
  report: string | null
  actions: { tool: string; input: unknown; result: string }[]
  error: string | null
}

export interface TopicSuggestion {
  id: string
  channel_id: string
  title: string
  summary: string
  status: 'suggested' | 'dismissed' | 'drafted'
  created_at: string
}

export interface AgentPlaybook {
  id: string
  channel_id: string
  version: number
  content: string
  created_at: string
}

export interface AgentExperience {
  id: string
  channel_id: string
  lesson: string
  created_at: string
}

export const STATUS_LABELS: Record<TargetStatus, string> = {
  draft: '임시저장',
  queued: '예약됨',
  publishing: '발행 중',
  published: '발행 완료',
  failed: '실패',
  canceled: '취소됨',
}
