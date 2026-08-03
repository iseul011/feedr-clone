import { db } from '../_shared/db.ts'
import { decrypt, encrypt } from '../_shared/crypto.ts'
import { providers } from '../_shared/providers/registry.ts'
import type { ProviderId } from '../_shared/providers/types.ts'

const CHANNEL_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  threads: '#111827',
  instagram: '#E4405F',
  tiktok: '#111827',
  x: '#111827',
  linkedin: '#0A66C2',
  facebook: '#0866FF',
}

// 플랫폼 OAuth 리다이렉트 수신 (verify_jwt = false)
Deno.serve(async (req) => {
  const url = new URL(req.url)
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
  const fail = (msg: string) =>
    Response.redirect(`${appUrl}/app/channels?error=${encodeURIComponent(msg)}`, 302)

  try {
    const code = url.searchParams.get('code')
    const stateRaw = url.searchParams.get('state')
    if (!code || !stateRaw) return fail('missing code/state')

    let state: { userId: string; provider: ProviderId; ts: number }
    try {
      state = JSON.parse(await decrypt(stateRaw))
    } catch {
      return fail('invalid state')
    }
    if (Date.now() - state.ts > 10 * 60 * 1000) return fail('state expired')

    const provider = providers[state.provider]
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`
    const info = await provider.exchangeCode(code, redirectUri)

    const { error } = await db.from('channels').upsert(
      {
        user_id: state.userId,
        provider: state.provider,
        provider_account_id: info.accountId,
        display_name: info.displayName,
        avatar_url: info.avatarUrl ?? null,
        access_token_enc: await encrypt(info.accessToken),
        refresh_token_enc: info.refreshToken ? await encrypt(info.refreshToken) : null,
        token_expires_at: info.expiresAt ?? null,
        status: 'connected',
        color: CHANNEL_COLORS[state.provider] ?? '#3B5BDB',
      },
      { onConflict: 'user_id,provider,provider_account_id' },
    )
    if (error) return fail(error.message)

    return Response.redirect(`${appUrl}/app/channels?connected=${state.provider}`, 302)
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
})
