import { db, json } from '../_shared/db.ts'
import { decrypt, encrypt } from '../_shared/crypto.ts'
import { providers } from '../_shared/providers/registry.ts'
import { AuthError } from '../_shared/providers/types.ts'
import type { ProviderId, TokenSet } from '../_shared/providers/types.ts'

const MAX_ATTEMPTS = 3

interface TargetRow {
  id: string
  post_id: string
  channel_id: string
  attempt_count: number
}

async function loadTokens(channel: Record<string, unknown>): Promise<TokenSet> {
  return {
    accessToken: await decrypt(channel.access_token_enc as string),
    refreshToken: channel.refresh_token_enc
      ? await decrypt(channel.refresh_token_enc as string)
      : undefined,
    expiresAt: (channel.token_expires_at as string) ?? undefined,
  }
}

async function processTarget(target: TargetRow): Promise<string> {
  const { data: channel } = await db.from('channels').select('*').eq('id', target.channel_id).single()
  const { data: post } = await db.from('posts').select('*').eq('id', target.post_id).single()
  if (!channel || !post) throw new Error('channel/post not found')
  if (channel.status !== 'connected') throw new AuthError('channel not connected')

  const provider = providers[channel.provider as ProviderId]
  let tokens = await loadTokens(channel)

  // 만료 5분 전이면 갱신 후 재암호화 저장
  if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() < Date.now() + 5 * 60 * 1000) {
    tokens = await provider.refresh(tokens)
    await db
      .from('channels')
      .update({
        access_token_enc: await encrypt(tokens.accessToken),
        refresh_token_enc: tokens.refreshToken ? await encrypt(tokens.refreshToken) : channel.refresh_token_enc,
        token_expires_at: tokens.expiresAt ?? null,
      })
      .eq('id', channel.id)
  }

  let mediaUrl: string | undefined
  if (post.media_path) {
    const { data, error } = await db.storage.from('media').createSignedUrl(post.media_path, 3600)
    if (error) throw new Error(`signed url failed: ${error.message}`)
    mediaUrl = data.signedUrl
  }

  const result = await provider.publish(tokens, {
    title: post.title,
    body: post.body,
    tags: post.tags ?? [],
    mediaUrl,
    mediaType: post.media_type ?? undefined,
  })

  await db
    .from('post_targets')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      provider_post_id: result.providerPostId,
      provider_url: result.url ?? null,
      error_message: null,
    })
    .eq('id', target.id)
  return 'published'
}

async function handleFailure(target: TargetRow, e: unknown): Promise<string> {
  const message = e instanceof Error ? e.message : String(e)
  if (e instanceof AuthError) {
    // 죽은 토큰 재시도는 소음 — 채널 재연동 요구
    await db.from('channels').update({ status: 'expired' }).eq('id', target.channel_id)
    await db
      .from('post_targets')
      .update({ status: 'failed', error_message: '채널 재연동이 필요합니다' })
      .eq('id', target.id)
    return 'auth_failed'
  }
  const attempts = target.attempt_count + 1
  if (attempts >= MAX_ATTEMPTS) {
    await db
      .from('post_targets')
      .update({ status: 'failed', attempt_count: attempts, error_message: message })
      .eq('id', target.id)
    return 'failed'
  }
  await db
    .from('post_targets')
    .update({
      status: 'queued',
      attempt_count: attempts,
      next_attempt_at: new Date(Date.now() + 2 ** attempts * 60 * 1000).toISOString(),
      error_message: message,
    })
    .eq('id', target.id)
  return 'retrying'
}

// pg_cron이 1분마다 호출 (service_role JWT)
Deno.serve(async () => {
  await db.rpc('reset_stuck_targets')
  const { data: targets, error } = await db.rpc('claim_due_targets', { batch_size: 10 })
  if (error) return json({ error: error.message }, 500)

  const results: Record<string, string> = {}
  for (const target of (targets ?? []) as TargetRow[]) {
    try {
      results[target.id] = await processTarget(target)
    } catch (e) {
      results[target.id] = await handleFailure(target, e)
    }
  }
  return json({ processed: Object.keys(results).length, results })
})
