-- =====================================================================
-- rls_test.sql | Uji akses: anon, member, editor, moderator, admin, pmb_officer
-- Jalankan di SQL Editor SETELAH migrasi 0001-0008. Semua dibatalkan (ROLLBACK),
-- jadi tidak meninggalkan data. Hasil: baris "ok - ..." di tab Messages/Notices.
-- Gagal => muncul "FAIL: ..." dan skrip berhenti.
-- =====================================================================
begin;

-- ---------- helper (sementara, hilang saat sesi berakhir) ----------
create function pg_temp.act_as(_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when _uid is null then '' else json_build_object('sub', _uid, 'role', 'authenticated')::text end, true);
  execute case when _uid is null then 'set local role anon' else 'set local role authenticated' end;
end $$;

create function pg_temp.assert_count(_uid uuid, _q text, _expected bigint, _label text) returns void
language plpgsql as $$
declare n bigint;
begin
  perform pg_temp.act_as(_uid);
  begin execute 'select count(*) from (' || _q || ') s' into n;
  exception when insufficient_privilege then n := 0; end;   -- GRANT dicabut = tidak terlihat
  reset role;
  if n is distinct from _expected then raise exception 'FAIL: % (diharapkan %, dapat %)', _label, _expected, n; end if;
  raise notice 'ok - %', _label;
end $$;

-- DML: _expected = jumlah baris berhasil diubah (0 = ditolak)
create function pg_temp.assert_affected(_uid uuid, _dml text, _expected bigint, _label text) returns void
language plpgsql as $$
declare n bigint;
begin
  perform pg_temp.act_as(_uid);
  begin execute _dml; get diagnostics n = row_count;
  exception when insufficient_privilege then n := 0; end;
  reset role;
  if n is distinct from _expected then raise exception 'FAIL: % (diharapkan %, dapat %)', _label, _expected, n; end if;
  raise notice 'ok - %', _label;
end $$;

-- ---------- fixture (dijalankan sebagai postgres, melewati RLS) ----------
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated','admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2','authenticated','authenticated','editor@test.local'),
  ('00000000-0000-0000-0000-0000000000a3','authenticated','authenticated','mod@test.local'),
  ('00000000-0000-0000-0000-0000000000a4','authenticated','authenticated','pmb@test.local'),
  ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','member1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2','authenticated','authenticated','member2@test.local');
insert into public.user_roles(user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1','admin'),
  ('00000000-0000-0000-0000-0000000000a2','editor'),
  ('00000000-0000-0000-0000-0000000000a3','moderator'),
  ('00000000-0000-0000-0000-0000000000a4','pmb_officer');

insert into public.news(title, slug, content, status) values
  ('Berita terbit','berita-terbit','isi','published'),
  ('Berita draf','berita-draf','isi','draft');

insert into public.aspirations(id, ticket_code, category, title, content, is_anonymous) values
  ('10000000-0000-0000-0000-000000000001','ASP-TEST0001','saran','Judul uji','Isi aspirasi uji',true);
insert into public.aspiration_updates(aspiration_id, note, is_internal) values
  ('10000000-0000-0000-0000-000000000001','CATATAN-INTERNAL-RAHASIA', true),
  ('10000000-0000-0000-0000-000000000001','Tanggapan publik uji', false);

insert into public.forum_categories(id, name, slug) values ('20000000-0000-0000-0000-000000000001','Umum','umum');
insert into public.forum_topics(id, category_id, author_id, title, content) values
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000b1','Topik uji member1','Isi topik uji');
insert into public.forum_comments(id, topic_id, author_id, content) values
  ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000b1','Komentar uji');

update public.site_settings set value = 'true'::jsonb where key = 'pmb_enabled';
insert into public.pmb_periods(id, academic_year, name, start_date, end_date, is_active) values
  ('50000000-0000-0000-0000-000000000001','UJI','Periode uji', current_date - 1, current_date + 30, true);
insert into public.study_programs(id, name, is_active) values ('60000000-0000-0000-0000-000000000001','Prodi Uji',true);
insert into public.applicants(registration_no, tracking_hash, user_id, period_id, program_id, full_name, email) values
  ('PMB-UJI-0001','x','00000000-0000-0000-0000-0000000000b2',
   '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Pendaftar Uji','b2@test.local');

-- ============================ PENGUJIAN ============================
-- --- Anonim ---
select pg_temp.assert_count(null, 'select 1 from public.news', 1, 'anon: hanya berita published terlihat');
select pg_temp.assert_count(null, 'select 1 from public.aspirations', 0, 'anon: tidak bisa membaca aspirasi');
select pg_temp.assert_count(null, 'select 1 from public.aspiration_updates', 0, 'anon: tidak bisa membaca catatan aspirasi');
select pg_temp.assert_count(null, 'select 1 from public.applicants', 0, 'anon: tidak bisa membaca pendaftar PMB');
select pg_temp.assert_count(null, 'select 1 from public.audit_logs', 0, 'anon: tidak bisa membaca audit log');
select pg_temp.assert_count(null, 'select 1 from public.user_roles', 0, 'anon: tidak bisa membaca role');
select pg_temp.assert_count(null, 'select 1 from public.private_config', 0, 'anon: private_config tertutup');
select pg_temp.assert_count(null, 'select 1 from public.site_settings where is_public', 10, 'anon: pengaturan publik terbaca');
select pg_temp.assert_count(null, 'select 1 from public.pmb_periods', 1, 'anon: periode PMB terlihat saat saklar aktif');
select pg_temp.assert_affected(null, $q$insert into public.news(title,slug,content,status) values ('x','x-x','x','published')$q$, 0, 'anon: tidak bisa menulis berita');
select pg_temp.assert_affected(null, $q$insert into public.aspirations(ticket_code,category,title,content) values ('ASP-HACK0001','saran','abc','abcde')$q$, 0, 'anon: tidak bisa insert langsung ke aspirations');
select pg_temp.assert_affected(null, $q$insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','admin')$q$, 0, 'anon: tidak bisa memberi role');

-- --- Member biasa ---
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','admin')$q$, 0, 'member: TIDAK bisa menjadikan diri admin');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b1', $q$update public.user_roles set role='admin' where user_id='00000000-0000-0000-0000-0000000000b1'$q$, 0, 'member: TIDAK bisa menaikkan role sendiri');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.news(title,slug,content,status) values ('x','x-y','x','published')$q$, 0, 'member: tidak bisa menulis berita');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000b1', 'select 1 from public.news', 1, 'member: draf berita tidak terlihat');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000b1', 'select 1 from public.applicants', 0, 'member1: tidak melihat pendaftar lain');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000b2', 'select 1 from public.applicants', 1, 'member2: melihat pendaftaran miliknya');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b2', $q$update public.applicants set status='accepted'$q$, 0, 'pendaftar: TIDAK bisa mengubah status sendiri');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b1', $q$update public.profiles set is_banned=false where id='00000000-0000-0000-0000-0000000000b1'$q$, 1, 'member: update profil sendiri diizinkan (is_banned dikunci trigger)');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b1', $q$update public.forum_topics set is_pinned=true where id='30000000-0000-0000-0000-000000000001'$q$, 0, 'member: tidak bisa mem-pin topik sendiri');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b1', $q$update public.forum_topics set title='Judul diubah pemilik' where id='30000000-0000-0000-0000-000000000001'$q$, 1, 'member: boleh mengubah isi topik miliknya');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b2', $q$update public.forum_topics set title='Retas' where id='30000000-0000-0000-0000-000000000001'$q$, 0, 'member2: tidak bisa mengubah topik milik orang lain');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_comments(topic_id,author_id,content) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','menyamar')$q$, 0, 'member: tidak bisa berkomentar atas nama orang lain');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_comments(topic_id,author_id,content) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','komentar sah')$q$, 1, 'member: boleh berkomentar atas nama sendiri');

-- --- Editor ---
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a2', 'select 1 from public.news', 2, 'editor: melihat draf berita');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.news(title,slug,content,status) values ('Dari editor','dari-editor','x','draft')$q$, 1, 'editor: boleh menulis berita');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','admin')$q$, 0, 'editor: tidak bisa memberi role');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a2', 'select 1 from public.aspirations', 0, 'editor: tidak bisa membaca aspirasi');

-- --- Moderator ---
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a3', 'select 1 from public.aspiration_updates', 2, 'moderator: membaca catatan internal');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000a3', $q$update public.forum_comments set is_hidden=true where id='40000000-0000-0000-0000-000000000001'$q$, 1, 'moderator: dapat menyembunyikan komentar');
select pg_temp.assert_count(null, 'select 1 from public.forum_comments', 1, 'anon: komentar tersembunyi tidak terlihat (hanya komentar sah yang tampil)');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a3', 'select 1 from public.applicants', 0, 'moderator: tidak bisa membaca pendaftar');

-- --- Admin ---
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a1', $q$select 1 from public.audit_logs where table_name='site_settings'$q$, 1, 'admin: membaca audit log perubahan pengaturan');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a2', 'select 1 from public.audit_logs', 0, 'editor: tidak bisa membaca audit log');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a1', 'select 1 from public.applicants', 0, 'admin: TIDAK bisa membaca data pendaftar (hanya pmb_officer/super_admin)');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','editor')$q$, 0, 'admin: tidak bisa memberi role (hanya super_admin)');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a1', 'select 1 from public.user_roles', 10, 'admin: membaca daftar role');

-- --- Petugas PMB ---
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a4', 'select 1 from public.applicants', 1, 'pmb_officer: membaca pendaftar');
select pg_temp.assert_affected('00000000-0000-0000-0000-0000000000a4', $q$update public.applicants set status='verifying'$q$, 1, 'pmb_officer: boleh mengubah status');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a4', $q$select 1 from public.applicant_status_histories where status_to='verifying'$q$, 1, 'pmb_officer: riwayat status tercatat otomatis');
select pg_temp.assert_count('00000000-0000-0000-0000-0000000000a4', 'select 1 from public.aspirations', 0, 'pmb_officer: tidak bisa membaca aspirasi');

-- ======================== RPC (alur publik) ========================
do $$
declare t text; j jsonb;
begin
  -- Pengiriman anonim lalu pelacakan: catatan internal TIDAK boleh bocor
  perform pg_temp.act_as(null);
  t := public.submit_aspiration('Judul anonim uji', 'Isi aspirasi anonim uji', 'saran', true);
  if t is null or t not like 'ASP-%' then raise exception 'FAIL: kode tiket anonim tidak valid'; end if;
  raise notice 'ok - anon: kirim aspirasi mendapat tiket %', t;

  j := public.track_aspiration('asp-test0001');
  reset role;
  if j is null then raise exception 'FAIL: pelacakan tiket gagal'; end if;
  if j::text like '%CATATAN-INTERNAL-RAHASIA%' then raise exception 'FAIL: catatan internal BOCOR ke publik'; end if;
  if jsonb_array_length(j->'history') <> 1 then raise exception 'FAIL: riwayat publik seharusnya 1 entri'; end if;
  raise notice 'ok - anon: pelacakan hanya menampilkan tanggapan publik';

  -- Kirim aspirasi anonim dengan lampiran harus ditolak
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
  begin
    perform public.submit_aspiration('Judul lampiran','Isi uji lampiran','saran', true, null, null,
            '00000000-0000-0000-0000-0000000000b1/x.pdf');
    reset role; raise exception 'FAIL: lampiran + anonim seharusnya ditolak';
  exception when raise_exception then
    reset role;
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'ok - anonim + lampiran ditolak';
  end;

  -- Pendaftaran PMB wajib login
  perform pg_temp.act_as(null);
  begin
    perform public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
      'Anon','x',date '2005-01-01','male','a@b.co','0','x','x',2023);
    reset role; raise exception 'FAIL: anon tidak boleh mendaftar PMB';
  exception when others then
    reset role;
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'ok - pendaftaran PMB tanpa login ditolak (%)', sqlerrm;
  end;
end $$;

-- Saklar PMB dimatikan => periode/prodi hilang dari publik
update public.site_settings set value = 'false'::jsonb where key = 'pmb_enabled';
select pg_temp.assert_count(null, 'select 1 from public.pmb_periods', 0, 'anon: PMB nonaktif => periode tidak terlihat');

rollback;
