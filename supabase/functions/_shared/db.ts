import { createClient } from 'npm:@supabase/supabase-js@2'

// service_role 클라이언트 (RLS 우회) — Edge Function 내부 전용
export const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 요청 JWT에서 유저 확인 (프론트에서 호출하는 함수용)
export async function requireUser(req: Request) {
  const auth = req.headers.get('Authorization') ?? ''
  const { data, error } = await db.auth.getUser(auth.replace('Bearer ', ''))
  if (error || !data.user) throw new Response('Unauthorized', { status: 401 })
  return data.user
}
