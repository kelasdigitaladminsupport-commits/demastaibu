-- =====================================================================
-- 0010_staff_directory.sql
-- Daftar staf pengelola (id + nama) untuk menetapkan penanggung jawab aspirasi
-- dan menampilkan nama penulis catatan. Hanya moderator/admin yang mendapat hasil;
-- pihak lain menerima 0 baris. Tidak membuka tabel profiles.
-- =====================================================================
create function public.list_assignable_staff()
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.full_name, ''), p.email, 'Staf') as name
  from public.profiles p
  where public.is_moderator()
    and exists (select 1 from public.user_roles r
                where r.user_id = p.id and r.role in ('super_admin', 'admin', 'moderator'))
  order by name;
$$;

revoke execute on function public.list_assignable_staff() from public, anon;
grant  execute on function public.list_assignable_staff() to authenticated;
