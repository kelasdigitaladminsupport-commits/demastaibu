-- admin_5b_test.sql | Uji pengaturan, struktur, role, blokir, log terhadap RLS. Semua di-ROLLBACK. Baris "ok - ..." = lulus.
begin;
-- Prasyarat: migrasi 0009 sudah dijalankan.
create function pg_temp.act_as(_uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', case when _uid is null then '' else json_build_object('sub',_uid,'role','authenticated')::text end, true);
 execute case when _uid is null then 'set local role anon' else 'set local role authenticated' end; end $$;
create function pg_temp.affected(_uid uuid,_dml text,_exp bigint,_label text) returns void language plpgsql as $$
declare n bigint; begin perform pg_temp.act_as(_uid);
 begin execute _dml; get diagnostics n=row_count; exception when insufficient_privilege or check_violation or foreign_key_violation then n:=0; end;
 reset role; if n is distinct from _exp then raise exception 'FAIL: % (harap %, dapat %)',_label,_exp,n; end if; raise notice 'ok - %',_label; end $$;
create function pg_temp.cnt(_uid uuid,_q text,_exp bigint,_label text) returns void language plpgsql as $$
declare n bigint; begin perform pg_temp.act_as(_uid);
 begin execute 'select count(*) from ('||_q||') s' into n; exception when insufficient_privilege then n:=0; end;
 reset role; if n is distinct from _exp then raise exception 'FAIL: % (harap %, dapat %)',_label,_exp,n; end if; raise notice 'ok - %',_label; end $$;

insert into auth.users(id,aud,role,email) values
 ('00000000-0000-0000-0000-0000000000a0','authenticated','authenticated','super@t'),
 ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated','admin@t'),
 ('00000000-0000-0000-0000-0000000000a2','authenticated','authenticated','editor@t'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','member@t');
insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000a0','super_admin'),('00000000-0000-0000-0000-0000000000a1','admin'),('00000000-0000-0000-0000-0000000000a2','editor');
insert into public.forum_categories(id,name,slug) values ('20000000-0000-0000-0000-000000000001','Umum','umum');

-- site_settings (upsert seperti frontend)
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.site_settings(key,value,is_public) values ('about','"Teks"',true),('privacy_policy','"x"',true) on conflict (key) do update set value=excluded.value, is_public=excluded.is_public$q$, 2, 'admin: upsert pengaturan (baris baru + lama)');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$update public.site_settings set value='true'::jsonb where key='pmb_enabled'$q$, 0, 'editor: TIDAK bisa ubah pengaturan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.site_settings(key,value,is_public) values ('x','1',true)$q$, 0, 'member: TIDAK bisa ubah pengaturan');
-- struktur
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.departments(name,slug,sort_order) values ('Bidang Uji','bidang-uji',0)$q$, 1, 'admin: tambah bidang');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.positions(title,level,sort_order) values ('Jabatan Uji',7,0)$q$, 1, 'admin: tambah jabatan');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.officers(full_name,position_id,department_id,period,is_published) select 'Nama Uji',p.id,d.id,'2025/2026',true from public.positions p, public.departments d where p.title='Jabatan Uji' and d.slug='bidang-uji'$q$, 1, 'admin: tambah pengurus');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a2', $q$insert into public.officers(full_name,position_id,period) select 'X Uji',id,'2025/2026' from public.positions limit 1$q$, 0, 'editor: TIDAK bisa tambah pengurus');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$delete from public.positions where title='Jabatan Uji'$q$, 0, 'jabatan yang dipakai pengurus tidak bisa dihapus (FK)') ;
-- role & pengguna
select pg_temp.affected('00000000-0000-0000-0000-0000000000a0', $q$insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','moderator')$q$, 1, 'super_admin: beri role');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','editor')$q$, 0, 'admin biasa: TIDAK bisa beri role');
select pg_temp.affected('00000000-0000-0000-0000-0000000000a0', $q$delete from public.user_roles where role='super_admin'$q$, 0, 'super_admin terakhir tidak bisa dicabut');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', 'select 1 from public.profiles', 4, 'admin: melihat semua profil');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000b1', 'select 1 from public.profiles', 1, 'member: hanya profil sendiri');
-- blokir
select pg_temp.affected('00000000-0000-0000-0000-0000000000a1', $q$update public.profiles set is_banned=true where id='00000000-0000-0000-0000-0000000000b1'$q$, 1, 'admin: blokir akun');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$insert into public.forum_topics(category_id,author_id,title,content) values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Judul topik','Isi topik uji')$q$, 0, 'akun diblokir: TIDAK bisa membuat topik');
select pg_temp.affected('00000000-0000-0000-0000-0000000000b1', $q$update public.profiles set is_banned=false where id='00000000-0000-0000-0000-0000000000b1'$q$, 1, 'akun diblokir mencoba buka blokir sendiri (baris cocok, nilai dikembalikan trigger)');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', $q$select 1 from public.profiles where is_banned$q$, 1, 'blokir tetap berlaku (trigger menjaga is_banned)');
-- audit
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a1', $q$select 1 from public.audit_logs where table_name='user_roles' and action='INSERT'$q$, 8, 'admin: log mencatat pemberian role (4 member otomatis + 4 manual)');
select pg_temp.cnt('00000000-0000-0000-0000-0000000000a2', 'select 1 from public.audit_logs', 0, 'editor: TIDAK bisa membaca log');
rollback;
