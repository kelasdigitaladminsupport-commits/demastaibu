-- =====================================================================
-- 0019_purge_unverified_users.sql  |  Hapus otomatis akun yang tidak diverifikasi dalam 24 jam
--
-- Setiap jam (menit ke-15) pekerjaan terjadwal menghapus akun yang:
--   * emailnya BELUM terverifikasi, dan
--   * dibuat lebih dari 24 jam lalu, dan
--   * belum pernah masuk, tidak punya role staf (user_roles), dan mendaftar lewat email+kata sandi.
-- Akun terhapus sepenuhnya (profil ikut terhapus). Saat mencoba masuk, pengguna mendapat pesan
-- "email atau kata sandi salah, atau akun tidak ditemukan", dan email itu bisa dipakai mendaftar lagi.
--
-- PRASYARAT: aktifkan ekstensi pg_cron lebih dulu (Dashboard -> Integrations -> Cron,
-- atau Database -> Extensions -> pg_cron). Jalankan skrip ini sesudahnya.
-- =====================================================================

do $$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron belum aktif. Aktifkan dulu di Supabase: Integrations -> Cron (atau Database -> Extensions -> pg_cron), lalu jalankan ulang skrip ini.';
  end if;
end $$;

create or replace function private.purge_unverified_users(p_hours int default 24)
returns int
language plpgsql security definer set search_path = public, auth, private as $$
declare v_n int;
begin
  with doomed as (
    delete from auth.users u
     where u.email_confirmed_at is null
       and u.last_sign_in_at is null
       and u.created_at < now() - make_interval(hours => p_hours)
       and coalesce(u.raw_app_meta_data ->> 'provider', 'email') = 'email'
       and not exists (select 1 from public.user_roles r where r.user_id = u.id)
    returning u.id
  )
  select count(*) into v_n from doomed;
  return v_n;
end $$;

revoke all on function private.purge_unverified_users(int) from public, anon, authenticated;

-- Jadwalkan ulang dengan aman (hapus jadwal lama bila ada).
do $$ begin
  perform cron.unschedule('purge-unverified-users');
exception when others then null;
end $$;

select cron.schedule('purge-unverified-users', '15 * * * *', $job$select private.purge_unverified_users(24)$job$);
