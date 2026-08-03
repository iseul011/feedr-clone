import { corsHeaders, json, requireUser } from '../_shared/db.ts'
import { encrypt } from '../_shared/crypto.ts'
import { providers } from '../_shared/providers/registry.ts'
import type { ProviderId } from '../_shared/providers/types.ts'

// GET ?provider=youtube → { authUrl } (프론트가 리다이렉트)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await requireUser(req)
    const providerId = new URL(req.url).searchParams.get('provider') as ProviderId
    const provider = providers[providerId]
    if (!provider) return json({ error: 'unknown provider' }, 400)
    if (!provider.implemented) return json({ error: `${providerId} 연동은 준비 중입니다` }, 400)

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`
    const state = await encrypt(
      JSON.stringify({ userId: user.id, provider: providerId, ts: Date.now() }),
    )
    return json({ authUrl: provider.authUrl(state, redirectUri) })
  } catch (e) {
    if (e instanceof Response) return e
    return json({ error: String(e) }, 500)
  }
})
