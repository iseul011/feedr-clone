// 오토파일럿 도구의 가드. DB와 분리된 순수 함수 — 프롬프트가 아니라 코드로 강제한다.

export const MIN_LEAD_MINUTES = 30

// 예약 시각 검증. 통과하면 null, 아니면 에이전트에게 돌려줄 오류 메시지
export function checkScheduledAt(iso: string, now = Date.now()): string | null {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return `scheduled_at "${iso}"를 시각으로 해석할 수 없습니다. ISO 8601로 주세요.`
  const min = now + MIN_LEAD_MINUTES * 60 * 1000
  if (t < min) {
    return `예약은 지금부터 최소 ${MIN_LEAD_MINUTES}분 뒤여야 합니다. ${new Date(min).toISOString()} 이후로 다시 잡아주세요.`
  }
  return null
}

// 실행당 생성 개수 상한
export function checkPostQuota(createdSoFar: number, max: number): string | null {
  if (createdSoFar >= max) {
    return `이번 실행의 생성 한도(${max}개)를 모두 사용했습니다. 더 만들지 말고 지금까지 한 일을 요약해주세요.`
  }
  return null
}
