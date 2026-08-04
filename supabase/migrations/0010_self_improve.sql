-- 자기개선 레이어 + 주제 제안 (approve 모드 사용자 선택 흐름)

-- Reflexion 메모리: 사이클마다 행동↔지표를 대조해 남기는 교훈
create table public.agent_experiences (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  run_id uuid references public.autopilot_runs (id) on delete set null,
  lesson text not null,
  created_at timestamptz not null default now()
);
create index agent_experiences_channel_idx on public.agent_experiences (channel_id, created_at desc);

-- 채널별 전략 플레이북: 에이전트가 스스로 재작성, 버전 보존
create table public.agent_playbooks (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version int not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (channel_id, version)
);

-- approve 모드 주제 제안: 리서치 결과를 저장하고 사용자가 골라 초안을 만든다
create table public.topic_suggestions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  run_id uuid references public.autopilot_runs (id) on delete set null,
  title text not null,
  summary text not null default '',
  status text not null default 'suggested' check (status in ('suggested', 'dismissed', 'drafted')),
  created_at timestamptz not null default now()
);
create index topic_suggestions_channel_idx on public.topic_suggestions (channel_id, status, created_at desc);

alter table public.agent_experiences enable row level security;
alter table public.agent_playbooks enable row level security;
alter table public.topic_suggestions enable row level security;

-- 읽기는 본인 것만 (쓰기는 service_role 러너 전용)
create policy "own experiences" on public.agent_experiences
  for select using (auth.uid () = user_id);
create policy "own playbooks" on public.agent_playbooks
  for select using (auth.uid () = user_id);
create policy "own suggestions" on public.topic_suggestions
  for select using (auth.uid () = user_id);
-- 주제 무시(dismiss)는 사용자가 직접 상태 변경
create policy "own suggestions update" on public.topic_suggestions
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
