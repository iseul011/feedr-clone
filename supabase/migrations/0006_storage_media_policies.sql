-- media 버킷: 본인 폴더({user_id}/...)만 업로드/조회
-- (버킷 자체는 대시보드/SQL로 생성: insert into storage.buckets (id, name, public) values ('media','media',false))
create policy "own media upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own media read" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
