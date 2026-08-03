import { db, json } from '../_shared/db.ts'
import { decrypt } from '../_shared/crypto.ts'
import { providers } from '../_shared/providers/registry.ts'
import type { ProviderId } from '../_shared/providers/types.ts'

// 일일 크론: 연결된 전 채널의 통계 스냅샷 (upsert — 같은 날 재실행 안전)
Deno.serve(async () => {
  const { data: channels, error } = await db
    .from('channels')
    .select('id, provider, access_token_enc')
    .eq('status', 'connected')
  if (error) return json({ error: error.message }, 500)

  const results: Record<string, string> = {}
  for (const ch of channels ?? []) {
    const provider = providers[ch.provider as ProviderId]
    if (!provider.fetchChannelStats) {
      results[ch.id] = 'no stats support'
      continue
    }
    try {
      const stats = await provider.fetchChannelStats({
        accessToken: await decrypt(ch.access_token_enc),
      })
      await db.from('analytics_snapshots').upsert(
        {
          channel_id: ch.id,
          captured_at: new Date().toISOString().slice(0, 10),
          followers: stats.followers,
          metrics: stats.metrics,
        },
        { onConflict: 'channel_id,captured_at' },
      )
      results[ch.id] = 'ok'
    } catch (e) {
      results[ch.id] = e instanceof Error ? e.message : String(e)
    }
  }
  return json({ synced: Object.keys(results).length, results })
})
