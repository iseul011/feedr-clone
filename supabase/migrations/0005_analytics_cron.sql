-- analytics-sync를 매일 호출하는 pg_cron 잡 (0003과 같은 패턴)
-- 적용 전 치환 필요: <PROJECT_REF>, <SERVICE_ROLE_KEY>
select cron.schedule(
  'analytics-sync-daily',
  '10 0 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/analytics-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
