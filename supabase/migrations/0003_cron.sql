-- publish-runner를 1분마다 호출하는 pg_cron 잡
-- 적용 전 치환 필요: <PROJECT_REF>, <SERVICE_ROLE_KEY>
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'publish-runner-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/publish-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
