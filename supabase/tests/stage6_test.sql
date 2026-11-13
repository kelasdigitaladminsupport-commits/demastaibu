-- stage6_test.sql | Uji aspirasi + forum terhadap RLS. Semua di-ROLLBACK. Baris "ok - ..." = lulus.
-- Prasyarat: migrasi 0001-0010.
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
 ('00000000-0000-0000-0000-0000000000a3','authenticated','authenticated','mod@t'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','m1@t'),
 ('00000000-0000-0000-0000-0000000000b2','authenticated','authenticated','m2@t');
insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000a3','moderator');
insert into public.forum_categories(id,name,slug) values ('20000000-0000-0000-0000-000000000001','Umum','umum');
insert into public.forum_topics(id,category_id,author_id,title,content) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Topik satu uji','Isi topik uji');
insert into public.forum_comments(id,topic_id,author_id,content) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Komentar uji');
insert into public.aspirations(id,ticket_code,category,title,content,is_anonymous,is_public,public_response) values
 ('10000000-0000-0000-0000-000000000001','ASP-PUBLIK01','saran','Aspirasi publik','Isi aspirasi publik',true,true,'Terima kasih'),
 ('10000000-0000-0000-0000-000000000002','ASP-PRIVAT01','kritik','Aspirasi privat','Isi aspirasi privat',true,false,null);

-- ===== Forum =====
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_likes(user_id,topic_id) values ('00000000-0000-0000-0000-0000000000b2','30000000-0000-0000-0000-000000000001')$q$, 1, 'member: menyukai topik');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_likes(user_id,comment_id) values ('00000000-0000-0000-0000-0000000000b2','40000000-0000-0000-0000-000000000001')$q$, 1, 'member: menyukai komentar');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_likes(user_id,topic_id) values ('00000000-0000-0000-0000-0000000000b1','30000000-0000-0000-0000-000000000001')$q$, 0, 'member: TIDAK bisa menyukai atas nama orang lain');
select pg_temp.cnt(null, 'select 1 from public.forum_like_counts where topic_id is not null', 1, 'anon: jumlah suka terbaca lewat view');
select pg_temp.cnt(null, 'select 1 from public.forum_likes', 0, 'anon: daftar penyuka tertutup');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_reports(reporter_id,topic_id,reason) values ('00000000-0000-0000-0000-0000000000b2','30000000-0000-0000-0000-000000000001','Spam')$q$, 1, 'member: melaporkan topik');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2', 'select 1 from public.forum_reports', 0, 'member: tidak bisa membaca laporan');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a3', 'select 1 from public.forum_reports', 1, 'moderator: membaca laporan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.forum_reports set status='resolved', handled_by='00000000-0000-0000-0000-0000000000a3'$q$, 1, 'moderator: menyelesaikan laporan');
-- tutup diskusi
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.forum_topics set status='closed', is_evaluation_material=true, is_pinned=true$q$, 1, 'moderator: tutup + tandai evaluasi + sematkan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_comments(topic_id,author_id,content) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','komentar di diskusi tertutup')$q$, 0, 'member: TIDAK bisa berkomentar di diskusi tertutup');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.forum_topics set status='open'$q$, 1, 'moderator: membuka diskusi');
-- balasan
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$insert into public.forum_comments(topic_id,parent_id,author_id,content) values ('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','balasan sah')$q$, 1, 'member: membalas komentar');
-- sembunyikan topik
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.forum_topics set status='hidden'$q$, 1, 'moderator: sembunyikan topik');
select pg_temp.cnt(null, 'select 1 from public.forum_topics', 0, 'anon: topik tersembunyi tidak terlihat');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1', 'select 1 from public.forum_topics', 1, 'penulis: tetap melihat topiknya yang disembunyikan');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b2', 'select 1 from public.forum_topics', 0, 'member lain: tidak melihat topik tersembunyi');
-- hapus komentar
select pg_temp.affected('00000000-0000-0000-0000-0000000000b2', $q$delete from public.forum_comments where author_id='00000000-0000-0000-0000-0000000000b1'$q$, 0, 'member: TIDAK bisa menghapus komentar orang lain');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$delete from public.forum_comments where author_id='00000000-0000-0000-0000-0000000000b1'$q$, 1, 'penulis: menghapus komentar sendiri');

-- ===== Aspirasi =====
select pg_temp.cnt(null, 'select 1 from public.public_aspirations', 1, 'anon: hanya aspirasi yang dipublikasikan terlihat');
select pg_temp.cnt(null, 'select 1 from public.aspirations', 0, 'anon: tabel aspirasi tertutup');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1', 'select 1 from public.aspirations', 0, 'member: tidak membaca aspirasi anonim orang lain');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.aspirations set status='reviewed', assigned_to='00000000-0000-0000-0000-0000000000a3' where ticket_code='ASP-PRIVAT01'$q$, 1, 'moderator: ubah status + tetapkan penanggung jawab');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.aspirations set status='rejected', status_reason=null where ticket_code='ASP-PRIVAT01'$q$, 0, 'status "tidak dapat ditindaklanjuti" tanpa alasan ditolak DB');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$update public.aspirations set status='rejected', status_reason='Di luar kewenangan DEMA' where ticket_code='ASP-PRIVAT01'$q$, 1, 'status rejected dengan alasan diterima');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$insert into public.aspiration_updates(aspiration_id,author_id,note,is_internal) values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a3','Catatan internal uji',true)$q$, 1, 'moderator: tambah catatan internal');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.aspiration_updates(aspiration_id,author_id,note) values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b1','retas')$q$, 0, 'member: TIDAK bisa menulis catatan aspirasi');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a3', $q$delete from public.aspirations$q$, 0, 'moderator (bukan admin): tidak bisa menghapus aspirasi');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a3', 'select 1 from public.list_assignable_staff()', 1, 'moderator: membaca daftar penanggung jawab');
do $$ declare j jsonb; begin
 perform pg_temp.act_as(null); j := public.track_aspiration('asp-privat01'); reset role;
 if j->>'status' <> 'rejected' then raise exception 'FAIL: status tidak sinkron'; end if;
 if j::text like '%Catatan internal uji%' then raise exception 'FAIL: catatan internal bocor'; end if;
 if j->>'status_reason' <> 'Di luar kewenangan DEMA' then raise exception 'FAIL: alasan tidak tampil'; end if;
 raise notice 'ok - pelacakan publik menampilkan status + alasan, tanpa catatan internal';
end $$;
rollback;
