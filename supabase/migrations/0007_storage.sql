-- =====================================================================
-- 0007_storage.sql  |  Bucket + Storage policies
-- Batas ukuran & MIME ditegakkan di level bucket (server-side).
-- Konvensi path: nama file acak (uuid) agar tidak bisa ditebak/bertabrakan.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media',           'public-media',           true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('avatars',                'avatars',                true,  2097152,  array['image/jpeg','image/png','image/webp']),
  ('public-docs',            'public-docs',            true,  10485760, array['application/pdf']),
  ('aspiration-attachments', 'aspiration-attachments', false, 5242880,  array['image/jpeg','image/png','image/webp','application/pdf']),
  ('partnership-proposals',  'partnership-proposals',  false, 5242880,  array['application/pdf']),
  ('pmb-documents',          'pmb-documents',          false, 5242880,  array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---- public-media & public-docs: baca publik, tulis editor ----
create policy "public-media read"   on storage.objects for select to anon, authenticated using (bucket_id = 'public-media');
create policy "public-media insert" on storage.objects for insert to authenticated with check (bucket_id = 'public-media' and public.is_editor());
create policy "public-media update" on storage.objects for update to authenticated using (bucket_id = 'public-media' and public.is_editor()) with check (bucket_id = 'public-media' and public.is_editor());
create policy "public-media delete" on storage.objects for delete to authenticated using (bucket_id = 'public-media' and public.is_editor());

create policy "public-docs read"   on storage.objects for select to anon, authenticated using (bucket_id = 'public-docs');
create policy "public-docs insert" on storage.objects for insert to authenticated with check (bucket_id = 'public-docs' and public.is_editor());
create policy "public-docs update" on storage.objects for update to authenticated using (bucket_id = 'public-docs' and public.is_editor()) with check (bucket_id = 'public-docs' and public.is_editor());
create policy "public-docs delete" on storage.objects for delete to authenticated using (bucket_id = 'public-docs' and public.is_editor());

-- ---- avatars: setiap pengguna hanya pada folder miliknya: <uid>/<file> ----
create policy "avatars read"   on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "avatars insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- aspiration-attachments (privat): hanya pengguna login, folder <uid>/ ----
create policy "aspiration-att insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'aspiration-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "aspiration-att select" on storage.objects for select to authenticated
  using (bucket_id = 'aspiration-attachments'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));
create policy "aspiration-att delete" on storage.objects for delete to authenticated
  using (bucket_id = 'aspiration-attachments' and public.is_moderator());

-- ---- partnership-proposals (privat): unggah anonim hanya ke folder incoming/ ----
create policy "proposal insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'partnership-proposals' and (storage.foldername(name))[1] = 'incoming');
create policy "proposal select" on storage.objects for select to authenticated
  using (bucket_id = 'partnership-proposals' and public.is_admin());
create policy "proposal delete" on storage.objects for delete to authenticated
  using (bucket_id = 'partnership-proposals' and public.is_admin());

-- ---- pmb-documents (privat): <uid>/<applicant_id>/<file> ----
create policy "pmb-doc insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'pmb-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pmb-doc select" on storage.objects for select to authenticated
  using (bucket_id = 'pmb-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_pmb_staff()));
create policy "pmb-doc delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pmb-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_pmb_staff()));
