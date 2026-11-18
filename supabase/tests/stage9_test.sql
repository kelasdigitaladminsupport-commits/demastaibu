-- stage9_test.sql | Uji rekrutmen kepengurusan + komentar/like berita. Semua di-ROLLBACK.
-- Prasyarat: migrasi 0001-0013 dan 0020 (posisi pendaftaran). Baris "ok - ..." = lulus.
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
-- Harapkan galat dengan pesan tertentu
create function pg_temp.fails(_uid uuid,_sql text,_msg text,_label text) returns void language plpgsql as $$
begin perform pg_temp.act_as(_uid);
 begin execute _sql; reset role; raise exception 'FAIL: % (tidak ditolak)',_label;
 exception when others then reset role; if sqlerrm like 'FAIL%' then raise; end if;
   if sqlerrm not like '%'||_msg||'%' then raise exception 'FAIL: % (galat tak terduga: %)',_label,sqlerrm; end if;
   raise notice 'ok - % (%)',_label,sqlerrm; end; end $$;

insert into auth.users(id,aud,role,email) values
 ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated','admin@t'),
 ('00000000-0000-0000-0000-0000000000a2','authenticated','authenticated','mod@t'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','p1@t'),
 ('00000000-0000-0000-0000-0000000000b2','authenticated','authenticated','p2@t'),
 ('00000000-0000-0000-0000-0000000000b3','authenticated','authenticated','banned@t');
insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000a1','admin'),('00000000-0000-0000-0000-0000000000a2','moderator');
update public.profiles set is_banned = true where id = '00000000-0000-0000-0000-0000000000b3';
insert into public.departments(id,name,slug) values
 ('d0000000-0000-0000-0000-000000000001','Bidang Uji 1','uji-1'),('d0000000-0000-0000-0000-000000000002','Bidang Uji 2','uji-2');
insert into public.recruitment_periods(id,academic_year,name,start_date,end_date,is_active) values
 ('70000000-0000-0000-0000-000000000001','UJI','Terbuka',current_date-1,current_date+30,true),
 ('70000000-0000-0000-0000-000000000002','UJI','Sudah tutup',current_date-60,current_date-30,true),
 ('70000000-0000-0000-0000-000000000003','UJI','Draf nonaktif',current_date-1,current_date+30,false);

-- ===== REKRUTMEN =====
select pg_temp.cnt(null,'select 1 from public.recruitment_periods',2,'publik: hanya periode aktif terlihat');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1','select 1 from public.recruitment_periods',3,'admin: melihat semua periode');
select pg_temp.fails(null,$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null,'Anon','123',null,3,'a@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true)$q$,'permission denied','anonim tidak dapat mendaftar');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null,'P Satu','123',null,3,'p1@x.id','08','Motivasi saya cukup panjang untuk lolos',null,false)$q$,'requirements_not_confirmed','syarat belum dikonfirmasi ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001',null,'P Satu','123',null,3,'p1@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true)$q$,'recruitment_closed','periode sudah tutup ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000001',null,'P Satu','123',null,3,'p1@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true)$q$,'recruitment_closed','periode nonaktif ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','P Satu','123',null,3,'p1@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true)$q$,'invalid_department','pilihan bidang kedua sama dengan pertama ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b3',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null,'Banned','123',null,3,'b@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true)$q$,'account_banned','akun terblokir ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null,'P Satu','123',null,3,'p1@x.id','08','pendek',null,true)$q$,'violates check constraint','motivasi terlalu pendek ditolak');
do $$ declare r jsonb; begin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
  r := public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','P Satu','123456','PAI',3,'p1@x.id','0811','Motivasi saya cukup panjang untuk lolos','Pengalaman',true);
  reset role; if (r->>'registration_no') not like 'REK%' then raise exception 'FAIL: nomor pendaftaran'; end if;
  raise notice 'ok - member mendaftar (%)', r->>'registration_no'; end $$;
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null,'P Satu','123',null,3,'p1@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true)$q$,'already_registered','daftar ganda pada periode sama ditolak');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$insert into public.recruitment_applications(registration_no,user_id,period_id,first_department_id,full_name,nim,email,phone,motivation,requirements_confirmed) values ('REKX','00000000-0000-0000-0000-0000000000b2','70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','X','123','x@x.id','0','Motivasi saya cukup panjang untuk lolos',true)$q$,0,'INSERT langsung ke tabel pendaftar ditolak');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1','select 1 from public.recruitment_applications',1,'pendaftar melihat pendaftarannya sendiri');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2','select 1 from public.recruitment_applications',0,'pendaftar lain tidak melihat data orang lain');
select pg_temp.cnt(null,'select 1 from public.recruitment_applications',0,'anonim tidak melihat pendaftar');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1','select 1 from public.recruitment_applications',1,'admin melihat pendaftar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$update public.recruitment_applications set status='accepted'$q$,0,'pendaftar tidak dapat mengubah status sendiri');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1',$q$update public.recruitment_applications set status='reviewing', note_public='Sedang ditinjau'$q$,1,'admin mengubah status + catatan');
do $$ begin perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
  perform public.withdraw_recruitment((select id from public.recruitment_applications limit 1)); reset role;
  raise notice 'ok - pendaftar mengundurkan diri saat masih ditinjau'; end $$;
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$select public.withdraw_recruitment((select id from public.recruitment_applications limit 1))$q$,'cannot_withdraw','tidak bisa mundur dua kali');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1',$q$select 1 from public.audit_logs where table_name='recruitment_applications' and (old_data ? 'nim' or new_data ? 'nim' or new_data ? 'phone')$q$,0,'audit log tidak memuat data pribadi pendaftar');

-- ===== BERITA: KOMENTAR & LIKE =====
insert into public.news(id,title,slug,content,status,published_at) values
 ('80000000-0000-0000-0000-000000000001','Terbit','terbit','isi','published',now()-interval '1 day'),
 ('80000000-0000-0000-0000-000000000002','Draf','draf','isi','draft',null),
 ('80000000-0000-0000-0000-000000000003','Terjadwal','terjadwal','isi','published',now()+interval '3 day');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_comments(id,news_id,author_id,content) values ('90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Komentar satu')$q$,1,'member berkomentar pada berita terbit');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_comments(news_id,author_id,content) values ('80000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b1','x')$q$,0,'tidak bisa berkomentar pada draf');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_comments(news_id,author_id,content) values ('80000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000b1','x')$q$,0,'tidak bisa berkomentar pada berita terjadwal');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_comments(news_id,author_id,content) values ('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','menyamar')$q$,0,'tidak bisa berkomentar atas nama orang lain');
select pg_temp.affected(null,$q$insert into public.news_comments(news_id,author_id,content) values ('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','anon')$q$,0,'anonim tidak bisa berkomentar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b3',$q$insert into public.news_comments(news_id,author_id,content) values ('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b3','banned')$q$,0,'akun terblokir tidak bisa berkomentar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$insert into public.news_comments(id,news_id,parent_id,author_id,content) values ('90000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','Balasan')$q$,1,'member membalas komentar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$insert into public.news_comments(news_id,parent_id,author_id,content) values ('80000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b2','Balasan bersarang')$q$,0,'balasan atas balasan ditolak (satu tingkat)');
select pg_temp.cnt(null,'select 1 from public.news_comments',2,'anonim dapat membaca komentar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$update public.news_comments set content='dibajak' where id='90000000-0000-0000-0000-000000000001'$q$,0,'tidak bisa mengedit komentar orang lain');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$update public.news_comments set content='diedit' where id='90000000-0000-0000-0000-000000000001'$q$,1,'pengguna mengedit komentarnya sendiri');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$update public.news_comments set is_hidden=true where id='90000000-0000-0000-0000-000000000001'$q$,0,'penulis tidak bisa menyembunyikan komentarnya (kolom moderasi)');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2',$q$update public.news_comments set is_hidden=true where id='90000000-0000-0000-0000-000000000002'$q$,1,'moderator menyembunyikan komentar');
select pg_temp.cnt(null,'select 1 from public.news_comments',1,'komentar tersembunyi tidak terbaca publik');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2','select 1 from public.news_comments',2,'penulis tetap melihat komentarnya yang disembunyikan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$delete from public.news_comments where id='90000000-0000-0000-0000-000000000001'$q$,0,'tidak bisa menghapus komentar orang lain');

select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_likes(user_id,news_id) values ('00000000-0000-0000-0000-0000000000b1','80000000-0000-0000-0000-000000000001')$q$,1,'like berita');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$insert into public.news_likes(user_id,news_id) values ('00000000-0000-0000-0000-0000000000b2','80000000-0000-0000-0000-000000000001')$q$,1,'like berita oleh pengguna kedua');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$insert into public.news_likes(user_id,comment_id) values ('00000000-0000-0000-0000-0000000000b2','90000000-0000-0000-0000-000000000001')$q$,1,'like komentar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_likes(user_id,news_id) values ('00000000-0000-0000-0000-0000000000b2','80000000-0000-0000-0000-000000000001')$q$,0,'tidak bisa like atas nama orang lain');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_likes(user_id,news_id) values ('00000000-0000-0000-0000-0000000000b1','80000000-0000-0000-0000-000000000002')$q$,0,'tidak bisa like berita draf');
select pg_temp.affected(null,$q$insert into public.news_likes(user_id,news_id) values ('00000000-0000-0000-0000-0000000000b1','80000000-0000-0000-0000-000000000001')$q$,0,'anonim tidak bisa like');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b1',$q$insert into public.news_likes(user_id,news_id) values ('00000000-0000-0000-0000-0000000000b1','80000000-0000-0000-0000-000000000001')$q$,'duplicate key','like ganda ditolak (unik)');
select pg_temp.cnt(null,$q$select 1 from public.news_like_counts where news_id='80000000-0000-0000-0000-000000000001' and likes=2$q$,1,'jumlah like berita = 2 (terbaca publik)');
select pg_temp.cnt(null,'select 1 from public.news_likes',0,'anonim tidak bisa membaca daftar penyuka');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1','select 1 from public.news_likes',1,'pengguna hanya melihat like miliknya');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2',$q$delete from public.news_likes where user_id='00000000-0000-0000-0000-0000000000b1'$q$,0,'tidak bisa menghapus like orang lain');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1',$q$delete from public.news_likes where user_id='00000000-0000-0000-0000-0000000000b1'$q$,1,'unlike');

-- Jalur Ketua/Wakil vs Koordinator/Anggota (migrasi 0020)
insert into auth.users(id,aud,role,email) values ('00000000-0000-0000-0000-0000000000b4','authenticated','authenticated','p4@t');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b4',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001',null,null,'P Empat','124',null,3,'p4@x.id','08','Motivasi saya cukup panjang untuk lolos','Pengalaman organisasi saya cukup panjang',true,'ketua',null,null)$q$,'leadership_fields_required','ketua tanpa visi-misi/program kerja ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b4',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001',null,null,'P Empat','124',null,3,'p4@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true,'wakil','Visi dan misi saya cukup panjang untuk diterima','Program kerja saya cukup panjang untuk diterima')$q$,'experience_required','wakil tanpa pengalaman ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b4',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001',null,null,'P Empat','124',null,3,'p4@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true,'anggota',null,null)$q$,'invalid_department','anggota tanpa bidang ditolak');
select pg_temp.fails('00000000-0000-0000-0000-0000000000b4',$q$select public.submit_recruitment('70000000-0000-0000-0000-000000000001',null,null,'P Empat','124',null,3,'p4@x.id','08','Motivasi saya cukup panjang untuk lolos',null,true,'presiden',null,null)$q$,'invalid_position','posisi tidak dikenal ditolak');
do $$ declare r jsonb; n int; begin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b4');
  r := public.submit_recruitment('70000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null,'P Empat','124',null,3,'p4@x.id','08','Motivasi saya cukup panjang untuk lolos','Pengalaman organisasi saya cukup panjang',true,'ketua','Visi dan misi saya cukup panjang untuk diterima','Program kerja saya cukup panjang untuk diterima');
  reset role;
  select count(*) into n from public.recruitment_applications where id = (r->>'id')::uuid and position='ketua' and first_department_id is null and vision_mission is not null;
  if n <> 1 then raise exception 'FAIL: ketua tersimpan tanpa bidang'; end if;
  raise notice 'ok - ketua mendaftar tanpa bidang, visi-misi tersimpan'; end $$;

-- Batas 20 komentar/jam
do $$ declare i int; begin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
  for i in 1..30 loop
    begin insert into public.news_comments(news_id,author_id,content) values ('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','spam '||i);
    exception when others then reset role; if sqlerrm like '%news_rate_limit%' then raise notice 'ok - batas komentar per jam aktif (berhenti di #%)', i; return; end if; raise; end;
  end loop; reset role; raise exception 'FAIL: batas komentar tidak berlaku'; end $$;
rollback;
