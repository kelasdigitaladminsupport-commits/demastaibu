-- stage8_test.sql | Uji PMB: pendaftaran, penguncian, dokumen privat, akses petugas. Semua di-ROLLBACK.
-- Prasyarat: migrasi 0001-0012. Baris "ok - ..." = lulus.
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
 ('00000000-0000-0000-0000-0000000000a4','authenticated','authenticated','pmb@t'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','p1@t'),
 ('00000000-0000-0000-0000-0000000000b2','authenticated','authenticated','p2@t');
insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000a1','admin'),('00000000-0000-0000-0000-0000000000a4','pmb_officer');
insert into public.pmb_periods(id,academic_year,name,start_date,end_date,is_active) values
 ('50000000-0000-0000-0000-000000000001','UJI','Periode terbuka',current_date-1,current_date+30,true),
 ('50000000-0000-0000-0000-000000000002','UJI','Periode tutup',current_date-60,current_date-30,true);
insert into public.study_programs(id,name,is_active) values ('60000000-0000-0000-0000-000000000001','Prodi Uji',true),('60000000-0000-0000-0000-000000000002','Prodi Nonaktif',false);

-- ===== Saklar PMB mati =====
select pg_temp.cnt(null,'select 1 from public.pmb_periods',0,'saklar mati: periode tidak terlihat publik');
select pg_temp.cnt(null,'select 1 from public.study_programs',0,'saklar mati: program studi tidak terlihat publik');
do $$ begin perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
  begin perform public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','X Uji',null,null,null,'x@x.id','0',null,null,null); reset role; raise exception 'FAIL: daftar saat PMB nonaktif';
  exception when raise_exception then reset role; if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok - saklar mati: pendaftaran ditolak (%)', sqlerrm; end; end $$;
update public.site_settings set value='true'::jsonb where key='pmb_enabled';
select pg_temp.cnt(null,'select 1 from public.pmb_periods',2,'saklar aktif: periode aktif terlihat');
select pg_temp.cnt(null,'select 1 from public.study_programs',1,'saklar aktif: hanya prodi aktif terlihat');

-- ===== Pendaftaran =====
do $$ declare r jsonb; begin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
  r := public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Peserta Satu','Kota',date '2006-05-05','male','p1@x.id','0811','Alamat','SMA 1',2024,null,null);
  reset role; perform set_config('t.app1', r->>'id', false);
  raise notice 'ok - login: daftar pada periode terbuka';
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
  begin perform public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Dobel',null,null,null,'p1@x.id','0',null,null,null); reset role; raise exception 'FAIL: daftar ganda';
  exception when raise_exception then reset role; if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok - daftar ganda pada periode sama ditolak (%)', sqlerrm; end;
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
  begin perform public.submit_applicant('50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','Telat',null,null,null,'p2@x.id','0',null,null,null); reset role; raise exception 'FAIL: periode tutup';
  exception when raise_exception then reset role; if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok - periode di luar rentang tanggal ditolak (%)', sqlerrm; end;
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
  begin perform public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','Prodi mati',null,null,null,'p2@x.id','0',null,null,null); reset role; raise exception 'FAIL: prodi nonaktif';
  exception when raise_exception then reset role; if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok - program studi nonaktif ditolak (%)', sqlerrm; end;
  perform pg_temp.act_as(null);
  begin perform public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Anon',null,null,null,'a@x.id','0',null,null,null); reset role; raise exception 'FAIL: anon daftar';
  exception when insufficient_privilege then reset role; raise notice 'ok - anon: tidak bisa mendaftar'; end;
end $$;

-- ===== Privasi data =====
select pg_temp.cnt(null,'select 1 from public.applicants',0,'anon: data pendaftar tertutup');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2','select 1 from public.applicants',0,'pendaftar lain: tidak melihat data orang lain');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1','select 1 from public.applicants',1,'pendaftar: melihat pendaftarannya sendiri');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1','select 1 from public.applicants',0,'admin biasa: TIDAK melihat data pendaftar');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a4','select 1 from public.applicants',1,'petugas PMB: melihat data pendaftar');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1','select 1 from public.applicant_status_histories',0,'pendaftar: tidak membaca tabel riwayat (ada catatan internal)');

-- ===== Ubah data sendiri & penguncian =====
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$update public.applicants set phone='0899', address='Alamat baru'$q$, 1, 'pendaftar: ubah data sendiri saat status Terkirim');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$update public.applicants set status='accepted'$q$, 0, 'pendaftar: TIDAK bisa mengubah status sendiri');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$update public.applicants set registration_no='PMB-PALSU'$q$, 0, 'pendaftar: TIDAK bisa mengubah nomor pendaftaran');
-- dokumen
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', format($q$insert into public.applicant_documents(applicant_id,doc_type,file_path) values (%L,'Dokumen uji','00000000-0000-0000-0000-0000000000b1/x/a.pdf')$q$, current_setting('t.app1')), 1, 'pendaftar: tambah dokumen saat status Terkirim');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', format($q$insert into public.applicant_documents(applicant_id,doc_type,file_path) values (%L,'Tempelan','x')$q$, current_setting('t.app1')), 0, 'pendaftar lain: TIDAK bisa menambah dokumen ke pendaftaran orang');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2','select 1 from public.applicant_documents',0,'pendaftar lain: tidak melihat dokumen orang');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1','select 1 from public.applicant_documents',0,'admin biasa: tidak melihat dokumen pendaftar');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a4','select 1 from public.applicant_documents',1,'petugas PMB: melihat dokumen');
-- storage
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into storage.objects(bucket_id,name) values ('pmb-documents','00000000-0000-0000-0000-0000000000b1/x/a.pdf')$q$, 1, 'pendaftar: unggah ke folder miliknya');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into storage.objects(bucket_id,name) values ('pmb-documents','00000000-0000-0000-0000-0000000000b2/x/a.pdf')$q$, 0, 'pendaftar: TIDAK bisa unggah ke folder orang lain');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2', $q$select 1 from storage.objects where bucket_id='pmb-documents'$q$, 0, 'pendaftar lain: tidak melihat berkas orang');
select pg_temp.cnt(null, $q$select 1 from storage.objects where bucket_id='pmb-documents'$q$, 0, 'anon: tidak melihat berkas PMB');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', $q$select 1 from storage.objects where bucket_id='pmb-documents'$q$, 0, 'admin biasa: tidak melihat berkas PMB');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a4', $q$select 1 from storage.objects where bucket_id='pmb-documents'$q$, 1, 'petugas PMB: melihat berkas PMB');

-- ===== Alur petugas: perbaikan lalu penguncian =====
do $$ begin perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
  perform public.set_applicant_status(current_setting('t.app1')::uuid,'need_revision','Perbaiki dokumen',null); reset role; end $$;
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$update public.applicants set phone='0877'$q$, 1, 'status Perlu perbaikan: pendaftar masih boleh mengubah data');
do $$ begin perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
  perform public.set_applicant_status(current_setting('t.app1')::uuid,'verified',null,null); reset role; end $$;
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$update public.applicants set phone='0866'$q$, 0, 'status Terverifikasi: data terkunci bagi pendaftar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', format($q$insert into public.applicant_documents(applicant_id,doc_type,file_path) values (%L,'Susulan','x')$q$, current_setting('t.app1')), 0, 'status Terverifikasi: tambah dokumen ditolak');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$delete from public.applicant_documents$q$, 0, 'status Terverifikasi: hapus dokumen ditolak');
-- periode/prodi dikelola
select pg_temp.affected('00000000-0000-0000-0000-0000000000a4', $q$insert into public.study_programs(name,is_active) values ('Prodi dari petugas',true)$q$, 1, 'petugas PMB: kelola program studi');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.pmb_periods(academic_year,name,start_date,end_date,is_active) values ('X','Dari admin',current_date,current_date+1,false)$q$, 1, 'admin: kelola periode');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.pmb_periods(academic_year,name,start_date,end_date) values ('X','Retas',current_date,current_date+1)$q$, 0, 'pendaftar: TIDAK bisa mengelola periode');
-- pelacakan kode
do $$ declare r jsonb; j jsonb; begin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
  r := public.submit_applicant('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Peserta Dua',null,null,null,'p2@x.id','0',null,null,null,null,null); reset role;
  perform pg_temp.act_as(null);
  j := public.track_applicant(r->>'registration_no', 'TRK-SALAH12345'); reset role;
  if j is not null then raise exception 'FAIL: kode salah membuka data'; end if; raise notice 'ok - pelacakan dengan kode salah => tidak ditemukan';
  perform pg_temp.act_as(null); j := public.track_applicant(lower(r->>'registration_no'), lower(r->>'tracking_code')); reset role;
  if j->>'status' <> 'submitted' then raise exception 'FAIL: pelacakan sah gagal'; end if;
  if j::text like '%p2@x.id%' or j::text like '%Peserta Dua%' then raise exception 'FAIL: pelacakan membocorkan data pribadi'; end if;
  raise notice 'ok - pelacakan sah menampilkan status tanpa data pribadi';
end $$;
rollback;
