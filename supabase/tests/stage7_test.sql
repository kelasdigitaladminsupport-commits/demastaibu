-- stage7_test.sql | Uji kemitraan, sponsor, donasi, laporan, kontak, Storage proposal. Semua di-ROLLBACK.
-- Prasyarat: migrasi 0001-0011. Baris "ok - ..." = lulus.
begin;
create function pg_temp.act_as(_uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', case when _uid is null then '' else json_build_object('sub',_uid,'role','authenticated')::text end, true);
 execute case when _uid is null then 'set local role anon' else 'set local role authenticated' end; end $$;
create function pg_temp.affected(_uid uuid,_dml text,_exp bigint,_label text) returns void language plpgsql as $$
declare n bigint; begin perform pg_temp.act_as(_uid);
 begin execute _dml; get diagnostics n=row_count; exception when insufficient_privilege or check_violation then n:=0; end;
 reset role; if n is distinct from _exp then raise exception 'FAIL: % (harap %, dapat %)',_label,_exp,n; end if; raise notice 'ok - %',_label; end $$;
create function pg_temp.cnt(_uid uuid,_q text,_exp bigint,_label text) returns void language plpgsql as $$
declare n bigint; begin perform pg_temp.act_as(_uid);
 begin execute 'select count(*) from ('||_q||') s' into n; exception when insufficient_privilege then n:=0; end;
 reset role; if n is distinct from _exp then raise exception 'FAIL: % (harap %, dapat %)',_label,_exp,n; end if; raise notice 'ok - %',_label; end $$;

insert into auth.users(id,aud,role,email) values
 ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated','admin@t'),
 ('00000000-0000-0000-0000-0000000000a2','authenticated','authenticated','editor@t'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','m@t');
insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000a1','admin'),('00000000-0000-0000-0000-0000000000a2','editor');

-- ===== Kemitraan (RPC anonim) =====
do $$ declare ref text; j jsonb; begin
  perform pg_temp.act_as(null);
  ref := public.submit_partnership('PT Contoh Uji','Budi','Budi@Contoh.id','0812','sponsor','Sponsor kegiatan','Seminar','Dana',5000000,'Kami ingin mendukung kegiatan.',true,'incoming/abc.pdf');
  reset role;
  if ref is null or ref not like 'KRJ-%' then raise exception 'FAIL: nomor referensi %', ref; end if;
  raise notice 'ok - anon: ajukan kemitraan mendapat nomor referensi';
  perform set_config('t.ref', ref, false);
  -- lacak: email beda huruf besar/kecil tetap cocok; email salah ditolak
  perform pg_temp.act_as(null); j := public.track_partnership(lower(ref), 'budi@contoh.ID'); reset role;
  if j is null or j->>'status' <> 'received' then raise exception 'FAIL: lacak gagal'; end if; raise notice 'ok - lacak dengan referensi + email (tidak peka huruf besar)';
  perform pg_temp.act_as(null); j := public.track_partnership(ref, 'orang.lain@x.id'); reset role;
  if j is not null then raise exception 'FAIL: email salah tetap membuka data'; end if; raise notice 'ok - email salah => tidak ditemukan';
  -- path proposal di luar incoming/ ditolak
  perform pg_temp.act_as(null);
  begin perform public.submit_partnership('PT Dua Uji','Ani','ani@x.id',null,'umkm','Donasi',null,null,null,'Pesan uji kemitraan',false,'../../rahasia.pdf'); reset role; raise exception 'FAIL: path berbahaya diterima';
  exception when insufficient_privilege then reset role; raise notice 'ok - path proposal berbahaya ditolak'; end;
end $$;
select pg_temp.cnt(null, 'select 1 from public.partnership_requests', 0, 'anon: tabel permohonan tertutup');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a2', 'select 1 from public.partnership_requests', 0, 'editor: tidak membaca permohonan');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', 'select 1 from public.partnership_requests', 1, 'admin: membaca permohonan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$update public.partnership_requests set status='agreed'$q$, 1, 'admin: ubah status permohonan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.partnership_updates(request_id,author_id,note,is_internal) select id,'00000000-0000-0000-0000-0000000000a1','Catatan internal kemitraan',true from public.partnership_requests$q$, 1, 'admin: catatan internal');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.partnership_updates(request_id,author_id,note,is_internal,status_to) select id,'00000000-0000-0000-0000-0000000000a1','Status diubah menjadi Disetujui',false,'agreed' from public.partnership_requests$q$, 1, 'admin: catatan terlihat pemohon');
do $$ declare j jsonb; begin
  perform pg_temp.act_as(null); j := public.track_partnership(current_setting('t.ref'), 'budi@contoh.id'); reset role;
  if j::text like '%Catatan internal kemitraan%' then raise exception 'FAIL: catatan internal bocor'; end if;
  if jsonb_array_length(j->'history') <> 1 then raise exception 'FAIL: riwayat publik harus 1'; end if;
  raise notice 'ok - pelacakan hanya menampilkan riwayat non-internal';
end $$;

-- ===== Sponsor: wajib izin publikasi =====
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.sponsors(name,request_id,is_published) select org_name,id,true from public.partnership_requests$q$, 1, 'sponsor dari mitra yang mengizinkan: boleh tayang');
update public.partnership_requests set publish_consent=false;
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.sponsors(name,request_id,is_published) select org_name,id,true from public.partnership_requests$q$, 0, 'sponsor dari mitra TANPA izin: tidak boleh tayang');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.sponsors(name,request_id,is_published) select org_name,id,false from public.partnership_requests$q$, 1, 'sponsor tanpa izin tetap boleh disimpan sebagai draf');
select pg_temp.cnt(null, 'select 1 from public.sponsors', 1, 'anon: hanya sponsor tayang yang terlihat');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.sponsors(name,is_published) values ('Sponsor editor',true)$q$, 0, 'editor: tidak bisa mengelola sponsor');

-- ===== Donasi =====
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.donations(donor_name,display_publicly,amount,purpose,donated_at,status,is_published,recorded_by) values ('Siti',false,250000,'Bakti sosial',current_date,'verified',true,'00000000-0000-0000-0000-0000000000a1')$q$, 1, 'admin: catat donasi');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.donations(amount) values (1000)$q$, 0, 'editor: tidak bisa mencatat donasi');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.donations(amount) values (0)$q$, 0, 'donasi dengan jumlah 0 ditolak DB');
select pg_temp.cnt(null, 'select 1 from public.public_donations', 0, 'anon: donasi tidak tampil saat fitur donasi nonaktif');
update public.site_settings set value='true'::jsonb where key='donation_enabled';
select pg_temp.cnt(null, 'select 1 from public.public_donations', 1, 'anon: donasi terverifikasi tampil saat fitur aktif');
select pg_temp.cnt(null, $q$select 1 from public.public_donations where donor_display='Anonim'$q$, 1, 'anon: nama donatur tanpa izin = "Anonim"');
select pg_temp.cnt(null, 'select 1 from public.donations', 0, 'anon: tabel donasi mentah tertutup');
-- Laporan: tayang wajib disetujui
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.donation_reports(title,is_published,approved_by) values ('Laporan tanpa persetujuan',true,null)$q$, 0, 'laporan tayang tanpa penyetuju ditolak DB');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.donation_reports(title,is_published,approved_by,approved_at) values ('Laporan disetujui',true,'00000000-0000-0000-0000-0000000000a1',now())$q$, 1, 'laporan tayang dengan penyetuju diterima');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.donation_reports(title,is_published) values ('Laporan draf',false)$q$, 1, 'laporan draf diterima');
select pg_temp.cnt(null, 'select 1 from public.donation_reports', 1, 'anon: hanya laporan yang disetujui terlihat');

-- ===== Kontak =====
do $$ begin perform pg_temp.act_as(null); perform public.submit_contact_message('Rina','rina@x.id','Subjek uji','Isi pesan uji'); reset role; raise notice 'ok - anon: kirim pesan kontak lewat RPC'; end $$;
select pg_temp.cnt(null, 'select 1 from public.contact_messages', 0, 'anon: pesan kontak tidak terbaca');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a2', 'select 1 from public.contact_messages', 0, 'editor: tidak membaca pesan kontak');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', 'select 1 from public.contact_messages', 1, 'admin: membaca pesan kontak');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$update public.contact_messages set status='replied'$q$, 1, 'admin: tandai dibalas');
select pg_temp.affected(null, $q$insert into public.contact_messages(name,email,subject,message) values ('x','x@x.id','subjek','pesan uji')$q$, 0, 'anon: tidak bisa insert langsung ke contact_messages');

-- ===== Storage proposal =====
select pg_temp.affected(null, $q$insert into storage.objects(bucket_id,name) values ('partnership-proposals','incoming/x.pdf')$q$, 1, 'anon: unggah proposal ke incoming/');
select pg_temp.affected(null, $q$insert into storage.objects(bucket_id,name) values ('partnership-proposals','lain/x.pdf')$q$, 0, 'anon: TIDAK bisa unggah di luar incoming/');
select pg_temp.cnt(null, $q$select 1 from storage.objects where bucket_id='partnership-proposals'$q$, 0, 'anon: tidak bisa membaca proposal');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a2', $q$select 1 from storage.objects where bucket_id='partnership-proposals'$q$, 0, 'editor: tidak bisa membaca proposal');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', $q$select 1 from storage.objects where bucket_id='partnership-proposals'$q$, 1, 'admin: membaca proposal');
rollback;
