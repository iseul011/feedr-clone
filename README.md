# feedr-clone

[feedr](https://feedr.youtuboost.com) — SNS 예약 발행 SaaS — 를 따라 구현하고, 지표를 보고 스스로 행동하는 자율 성장 에이전트(오토파일럿)를 얹는 프로젝트입니다.

## 스택

- **프론트**: React + Vite + TypeScript (인라인 스타일, Pretendard, `#3B5BDB`)
- **백엔드**: Supabase — Postgres(발행 큐), Auth, Storage(`media` 버킷), Edge Functions, pg_cron
- **오토파일럿**(4단계): Edge Function `autopilot-runner` — Claude SDK toolRunner 기반 자율 에이전트 (별도 인프라 없음)

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

`.env` (`.env.example` 참고):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...   # publishable key
```

## Supabase 세팅

1. 마이그레이션 적용: `supabase/migrations/` 순서대로 (MCP `apply_migration` 또는 CLI)
2. Storage 버킷 `media` 생성 (private)
3. Edge Functions 배포: `oauth-start`, `oauth-callback`(verify_jwt=false), `publish-runner`, `ai-assist`, `analytics-sync`, `autopilot-runner`
   - `autopilot-runner`는 verify_jwt 기본값(true)을 유지할 것 — 크론 경로(body 없음)가 전 채널을 무인증 로직으로 돌기 때문에 JWT 검증이 유일한 방어선

4. Edge Function 시크릿:
   - `TOKEN_ENC_KEY` — base64 32바이트 (`openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth 클라이언트
   - `THREADS_APP_ID` / `THREADS_APP_SECRET` — Meta 개발자 앱
   - `APP_URL` — 프론트 주소 (예: http://localhost:5173)
   - `ANTHROPIC_API_KEY` — AI 어시스트 + 오토파일럿 공용 (Claude API)
5. pg_cron: 1분마다 `publish-runner`(`0003`), 매일 `analytics-sync`(`0005`)·`autopilot-runner`(`0008`) — 세 파일 모두 `<PROJECT_REF>`/`<SERVICE_ROLE_KEY>` 치환 후 적용

## 플랫폼 API 제약 (중요)

- **YouTube**: 업로드 1건 = 쿼터 1,600유닛, 기본 10,000유닛/일 → **약 6개 업로드/일**.
  더 필요하면 [Audit and Quota Extension Form](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits) 신청.
- **Google OAuth 앱이 '테스트' 상태면 리프레시 토큰이 7일 만에 만료** → 7일마다 재연동 필요.
  게시(In production) + 검수 완료 후 해소.
- **Threads**: 프로필당 250포스트/24시간. 장기 토큰 60일(자동 갱신 구현됨).
- Instagram/TikTok/X/LinkedIn/Facebook: 개발자 앱 심사 필요 — 어댑터 슬롯만 있고 "연동 예정" 처리.
  실연동 추가 시 `supabase/functions/_shared/providers/`의 stub만 교체하면 됨.

## 개발 워크플로우

- PR을 열면 GitHub Actions에서 Claude가 자동으로 코드 리뷰를 수행합니다 (`.github/workflows/claude-code-review.yml`).
- Edge Function 테스트: `deno test --allow-env supabase/functions/_shared/crypto.test.ts supabase/functions/_shared/autopilot.test.ts`

## 오토파일럿 (4단계)

채널별로 켜는 자율 성장 에이전트. `/app/autopilot`에서 브랜드·페르소나·모드를 설정한다.

- **approve 모드(기본)**: 에이전트가 만든 글은 `draft`로 저장 → 대기열 '승인 대기' 섹션에서 승인해야 발행
- **auto 모드**: 예약이 그대로 큐에 들어가 자동 발행
- 가드는 프롬프트가 아니라 코드로 강제 (`_shared/autopilot.ts`): 예약은 최소 30분 뒤, 실행당 생성 상한 1~5개
- 실행 기록(`autopilot_runs`)에 보고서와 도구 호출 내역이 남는다. 트리거는 "지금 실행" 버튼 또는 매일 크론(`0008`)
