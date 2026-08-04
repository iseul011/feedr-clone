import { db, json } from '../_shared/db.ts'
import { decrypt } from '../_shared/crypto.ts'
import { providers } from '../_shared/providers/registry.ts'
import type { ProviderId } from '../_shared/providers/types.ts'

// 일일 크론: 연결된 전 채널의 통계 스냅샷 + 게시물별 인사이트 (upsert — 같은 날 재실행 안전)
Deno.serve(async () => {
  const { data: channels, error } = await db
    .from('channels')
    .select('id, provider, user_id, access_token_enc')
    .eq('status', 'connected')
  if (error) return json({ error: error.message }, 500)

  const today = new Date().toISOString().slice(0, 10)
  const results: Record<string, string> = {}

  for (const ch of channels ?? []) {
    const provider = providers[ch.provider as ProviderId]
    if (!provider.fetchChannelStats) {
      results[ch.id] = 'no stats support'
      continue
    }
    try {
      const token = { accessToken: await decrypt(ch.access_token_enc) }
      const stats = await provider.fetchChannelStats(token)
      await db.from('analytics_snapshots').upsert(
        {
          channel_id: ch.id,
          captured_at: today,
          followers: stats.followers,
          metrics: stats.metrics,
        },
        { onConflict: 'channel_id,captured_at' },
      )

      // 게시물별 인사이트 — 최근 발행 30건까지 (실패해도 채널 스냅샷은 유지)
      let postCount = 0
      if (provider.fetchPostInsights) {
        const { data: targets } = await db
          .from('post_targets')
          .select('id, provider_post_id')
          .eq('channel_id', ch.id)
          .eq('status', 'published')
          .not('provider_post_id', 'is', null)
          .order('published_at', { ascending: false })
          .limit(30)
        for (const target of targets ?? []) {
          try {
            const m = await provider.fetchPostInsights(token, target.provider_post_id as string)
            await db.from('post_insights').upsert(
              {
                target_id: target.id,
                channel_id: ch.id,
                user_id: ch.user_id,
                captured_at: today,
                views: m.views ?? 0,
                likes: m.likes ?? 0,
                replies: m.replies ?? 0,
                reposts: m.reposts ?? 0,
                quotes: m.quotes ?? 0,
                shares: m.shares ?? 0,
              },
              { onConflict: 'target_id,captured_at' },
            )
            postCount++
          } catch {
            // 개별 게시물 실패는 건너뛴다 (삭제된 글, 권한 미부여 토큰 등)
          }
        }
      }
      results[ch.id] = `ok (posts: ${postCount})`
    } catch (e) {
      results[ch.id] = e instanceof Error ? e.message : String(e)
    }
  }
  return json({ synced: Object.keys(results).length, results })
})
