-- admin_write_test.sql | Uji jalur tulis dashboard (editor/member/anon) terhadap RLS + Storage. Semua di-ROLLBACK.
-- Jalankan di SQL Editor. Baris "ok - ..." = lulus. Bagian Storage menyisipkan baris langsung ke storage.objects (hanya untuk uji).
begin;
create function pg_temp.act_as(_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when _uid is null then '' else json_build_object('sub', _uid, 'role', 'authenticated')::text end, true);
  execute case when _uid is null then 'set local role anon' else 'set local role authenticated' end;
end $$;
create function pg_temp.affected(_uid uuid, _dml text, _exp bigint, _label text) returns void language plpgsql as $$
declare n bigint;
begin
  perform pg_temp.act_as(_uid);
  begin execute _dml; get diagnostics n = row_count; exception when insufficient_privilege or check_violation then n := 0; end;
  reset role;
  if n is distinct from _exp then raise exception 'FAIL: % (harap %, dapat %)', _label, _exp, n; end if;
  raise notice 'ok - %', _label;
end $$;

insert into auth.users (id, aud, role, email) values
 ('00000000-0000-0000-0000-0000000000a2','authenticated','authenticated','editor@t'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','member@t');
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000a2','editor');

-- Editor: tulis konten (kolom yang dikirim frontend, termasuk author_id/created_by)
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.news_categories(name,slug) values ('Umum','umum')$q$, 1, 'editor: tambah kategori');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.news(title,slug,category_id,author_name,cover_path,excerpt,content,status,published_at,author_id) select 'Berita uji','berita-uji',id,null,null,null,'x','published',null,'00000000-0000-0000-0000-0000000000a2' from public.news_categories$q$, 1, 'editor: tambah berita (published_at kosong)');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.events(title,slug,event_date,end_date,location,description,poster_path,status,is_published,created_by) values ('Agenda uji','agenda-uji',now(),null,null,null,null,'upcoming',true,'00000000-0000-0000-0000-0000000000a2')$q$, 1, 'editor: tambah agenda');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.events(title,slug,event_date,end_date,status) values ('Agenda dua','agenda-dua',now(), now()-interval '1 day','upcoming')$q$, 0, 'agenda: end_date < event_date ditolak DB') ;
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.programs(title,slug,department_id,status,start_date,end_date,is_published) values ('Program uji','program-uji',null,'planned','2026-01-01','2026-02-01',true)$q$, 1, 'editor: tambah program');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.galleries(title,is_published) values ('G',true)$q$, 1, 'editor: tambah galeri');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.gallery_items(gallery_id,image_path,sort_order) select id,'galleries/x.jpg',1 from public.galleries$q$, 1, 'editor: tambah foto galeri');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.community_programs(title,slug,status) values ('Pengabdian uji','pengabdian-uji','planned')$q$, 1, 'editor: tambah pengabdian');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.public_reports(title,report_type,is_published) values ('R','activity',true)$q$, 1, 'editor: tambah laporan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$update public.news set status='draft'$q$, 1, 'editor: ubah berita');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$delete from public.news$q$, 1, 'editor: hapus berita');
-- Storage
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into storage.objects(bucket_id,name) values ('public-media','news/a.jpg')$q$, 1, 'editor: unggah ke public-media');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into storage.objects(bucket_id,name) values ('public-docs','reports/a.pdf')$q$, 1, 'editor: unggah ke public-docs');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into storage.objects(bucket_id,name) values ('pmb-documents','x/y.pdf')$q$, 0, 'editor: TIDAK bisa menulis ke pmb-documents');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into storage.objects(bucket_id,name) values ('public-media','news/m.jpg')$q$, 0, 'member: TIDAK bisa unggah ke public-media');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.events(title,slug,event_date,status) values ('Agenda xx','agenda-xx',now(),'upcoming')$q$, 0, 'member: TIDAK bisa tambah agenda');
select pg_temp.affected(null, $q$insert into storage.objects(bucket_id,name) values ('public-media','news/anon.jpg')$q$, 0, 'anon: TIDAK bisa unggah');
rollback;
