import { supabase } from './supabase'

// Edge Function 호출 (세션 JWT 자동 첨부). body를 주면 POST.
export async function callFn<T>(
  name: string,
  params?: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const qs = params ? `?${new URLSearchParams(params)}` : ''
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}${qs}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const resBody = await res.json()
  if (!res.ok) throw new Error(resBody.error ?? `${name} failed (${res.status})`)
  return resBody as T
}

export type AiKind = 'idea' | 'repurpose' | 'best_time'

export function aiAssist(kind: AiKind, prompt: string): Promise<{ text: string }> {
  return callFn('ai-assist', undefined, { kind, prompt })
}
