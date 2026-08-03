// deno test supabase/functions/_shared/autopilot.test.ts
import { checkPostQuota, checkScheduledAt, MIN_LEAD_MINUTES } from './autopilot.ts'

const NOW = Date.parse('2026-08-04T00:00:00Z')
const at = (minutes: number) => new Date(NOW + minutes * 60 * 1000).toISOString()

Deno.test('예약 시각: 리드타임 이후는 통과', () => {
  if (checkScheduledAt(at(MIN_LEAD_MINUTES + 1), NOW) !== null) throw new Error('거부되면 안 됨')
})

Deno.test('예약 시각: 리드타임 이내는 거부', () => {
  if (checkScheduledAt(at(MIN_LEAD_MINUTES - 1), NOW) === null) throw new Error('거부해야 함')
  if (checkScheduledAt(at(-60), NOW) === null) throw new Error('과거 시각은 거부해야 함')
})

Deno.test('예약 시각: 파싱 불가는 거부', () => {
  if (checkScheduledAt('내일 저녁', NOW) === null) throw new Error('거부해야 함')
})

Deno.test('생성 한도: 미만은 통과, 도달하면 거부', () => {
  if (checkPostQuota(1, 2) !== null) throw new Error('거부되면 안 됨')
  if (checkPostQuota(2, 2) === null) throw new Error('한도 도달 시 거부해야 함')
  if (checkPostQuota(3, 2) === null) throw new Error('한도 초과 시 거부해야 함')
})
