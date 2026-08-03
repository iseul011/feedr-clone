-- 채널별 일일 통계 스냅샷
create table public.analytics_snapshots (
  id bigint generated always as identity primary key,
  channel_id uuid not null references public.channels (id) on delete cascade,
  captured_at date not null default current_date,
  followers int not null default 0,
  metrics jsonb not null default '{}',
  unique (channel_id, captured_at)
);

alter table public.analytics_snapshots enable row level security;

create policy "own snapshots" on public.analytics_snapshots
  for select using (
    exists (select 1 from public.channels c where c.id = channel_id and c.user_id = auth.uid ())
  );

-- AI 사용 로그 겸 무료 티어 일일 제한기
create table public.ai_generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('idea', 'repurpose', 'best_time')),
  prompt text not null,
  response text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_generations enable row level security;

create policy "own generations" on public.ai_generations
  for select using (auth.uid () = user_id);

create index ai_generations_daily_idx on public.ai_generations (user_id, created_at);
