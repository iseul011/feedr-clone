-- 콘텐츠 지침: 페르소나와 별개로 주제·스타일·금지사항을 상세 기술하는 자유 텍스트
alter table public.autopilot_settings
  add column guidelines text not null default '';
