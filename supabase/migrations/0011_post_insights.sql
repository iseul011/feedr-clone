-- 게시물 단위 인사이트 일일 스냅샷 (Threads media insights)
create table public.post_insights (
  target_id uuid not null references public.post_targets (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  captured_at date not null default current_date,
  views int not null default 0,
  likes int not null default 0,
  replies int not null default 0,
  reposts int not null default 0,
  quotes int not null default 0,
  shares int not null default 0,
  primary key (target_id, captured_at)
);
create index post_insights_channel_idx on public.post_insights (channel_id, captured_at desc);

alter table public.post_insights enable row level security;

-- 읽기는 본인 것만 (쓰기는 service_role 크론 전용)
create policy "own post insights" on public.post_insights
  for select using (auth.uid () = user_id);
