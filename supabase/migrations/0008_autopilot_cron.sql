-- autopilot-runner를 매일 호출하는 pg_cron 잡 (0003/0005와 같은 패턴)
-- body 없이 호출하면 enabled=true인 전 채널을 돈다
-- 적용 전 치환 필요: <PROJECT_REF>, <SERVICE_ROLE_KEY>
select cron.schedule(
  'autopilot-daily',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/autopilot-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
