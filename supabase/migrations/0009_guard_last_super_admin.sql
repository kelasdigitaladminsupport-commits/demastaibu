-- =====================================================================
-- 0009_guard_last_super_admin.sql
-- Mencegah super_admin TERAKHIR dicabut/dihapus lewat API (anti terkunci).
-- Perubahan lewat SQL Editor / service role (auth.uid() null) tetap diizinkan.
-- =====================================================================
create function public.guard_last_super_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if old.role = 'super_admin'
     and (tg_op = 'DELETE' or new.role <> 'super_admin' or new.user_id <> old.user_id) then
    if not exists (select 1 from public.user_roles where role = 'super_admin' and id <> old.id) then
      raise exception 'last_super_admin' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_last_super_admin
  before update or delete on public.user_roles
  for each row execute function public.guard_last_super_admin();

revoke execute on function public.guard_last_super_admin() from public, anon, authenticated;
