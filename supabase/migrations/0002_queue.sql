-- 연결된 SNS 채널
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (
    provider in ('youtube', 'threads', 'instagram', 'tiktok', 'x', 'linkedin', 'facebook')
  ),
  provider_account_id text not null,
  display_name text not null,
  avatar_url text,
  access_token_enc text not null,   -- AES-256-GCM, base64(iv||ct||tag)
  refresh_token_enc text,
  token_expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked')),
  color text not null default '#3B5BDB',
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

-- 콘텐츠 (포스트 1개 : 발행 대상 N개)
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  tags text[] not null default '{}',
  media_path text,                  -- storage 'media' 버킷 경로
  media_type text check (media_type in ('video', 'image')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 발행 큐: (post, channel)당 1행
create table public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'queued' check (
    status in ('draft', 'queued', 'publishing', 'published', 'failed', 'canceled')
  ),
  attempt_count int not null default 0,
  next_attempt_at timestamptz,
  published_at timestamptz,
  provider_post_id text,
  provider_url text,
  error_message text,
  first_comment text,               -- 이후 단계용 예약 컬럼
  claimed_at timestamptz,           -- publishing 진입 시각 (크래시 복구용)
  created_at timestamptz not null default now()
);

create index post_targets_due_idx on public.post_targets (status, scheduled_at)
  where status = 'queued';

-- RLS: 본인 소유 행만
alter table public.channels enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;

create policy "own channels" on public.channels
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "own posts" on public.posts
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "own post_targets" on public.post_targets
  for all using (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid ())
  ) with check (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid ())
  );

-- 발행 러너의 원자적 클레임 (service_role 전용, FOR UPDATE SKIP LOCKED)
create function public.claim_due_targets (batch_size int default 10)
returns setof public.post_targets
language sql security definer set search_path = ''
as $$
  update public.post_targets t
  set status = 'publishing', claimed_at = now()
  where t.id in (
    select id from public.post_targets
    where status = 'queued'
      and scheduled_at <= now()
      and (next_attempt_at is null or next_attempt_at <= now())
    order by scheduled_at
    limit batch_size
    for update skip locked
  )
  returning t.*;
$$;

revoke execute on function public.claim_due_targets from anon, authenticated;

-- 러너 크래시 복구: 10분 넘게 publishing에 머문 행 리셋
create function public.reset_stuck_targets ()
returns void
language sql security definer set search_path = ''
as $$
  -- ponytail: 발행 API 성공 직후 크래시면 드물게 중복 발행 가능. 문제되면 provider_post_id 선기록으로 보완
  update public.post_targets
  set status = 'queued'
  where status = 'publishing'
    and claimed_at < now() - interval '10 minutes';
$$;

revoke execute on function public.reset_stuck_targets from anon, authenticated;
