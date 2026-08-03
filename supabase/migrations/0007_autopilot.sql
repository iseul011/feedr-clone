-- 오토파일럿 설정: 채널당 1행 (같은 사용자의 채널을 서로 다른 모드로 운영하기 위함)
create table public.autopilot_settings (
  channel_id uuid primary key references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  mode text not null default 'approve' check (mode in ('approve', 'auto')),
  brand_name text not null default '',
  persona text not null default '',
  max_posts_per_run int not null default 2 check (max_posts_per_run between 1 and 5),
  updated_at timestamptz not null default now()
);

-- 실행 기록. 액션 로그는 별도 테이블 없이 jsonb 배열 — 조회가 "이번 실행에 뭐 했나"뿐이라 조인 불필요
create table public.autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  report text,
  actions jsonb not null default '[]',
  error text
);

create index autopilot_runs_channel_idx on public.autopilot_runs (channel_id, started_at desc);

alter table public.autopilot_settings enable row level security;
alter table public.autopilot_runs enable row level security;

-- 설정은 본인 것만 읽고 쓰기
create policy "own autopilot settings" on public.autopilot_settings
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

-- 실행 기록은 읽기만 (쓰기는 service_role 러너 전용)
create policy "own autopilot runs" on public.autopilot_runs
  for select using (auth.uid () = user_id);
