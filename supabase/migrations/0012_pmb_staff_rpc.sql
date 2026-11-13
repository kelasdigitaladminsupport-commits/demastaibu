-- =====================================================================
-- 0012_pmb_staff_rpc.sql
-- 1) set_applicant_status: petugas PMB mengubah status + catatan publik/internal dalam
--    satu langkah tanpa entri riwayat ganda.
-- 2) log_applicant_export: ekspor data pendaftar wajib tercatat di audit_logs.
-- =====================================================================

-- Trigger riwayat otomatis dilewati bila RPC sudah mencatat sendiri.
create or replace function public.log_applicant_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.skip_status_log', true), '') <> '1' then
    insert into public.applicant_status_histories(applicant_id, status_from, status_to, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

create function public.set_applicant_status(
  p_id uuid, p_status text, p_note_public text default null, p_note_internal text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not public.is_pmb_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select status into v_old from public.applicants where id = p_id for update;
  if not found then raise exception 'not_found'; end if;

  if p_status is distinct from v_old then
    perform set_config('app.skip_status_log', '1', true);
    update public.applicants set status = p_status where id = p_id;   -- CHECK constraint menolak status tidak valid
    perform set_config('app.skip_status_log', '', true);
  end if;

  insert into public.applicant_status_histories(applicant_id, status_from, status_to, note_public, note_internal, changed_by)
  values (p_id, v_old, p_status, nullif(btrim(p_note_public), ''), nullif(btrim(p_note_internal), ''), auth.uid());
end $$;

create function public.log_applicant_export(p_count int, p_filter text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pmb_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.audit_logs(actor_id, action, table_name, record_id, new_data)
  values (auth.uid(), 'EXPORT', 'applicants', null,
          jsonb_build_object('rows', p_count, 'filter', left(coalesce(p_filter, ''), 300)));
end $$;

revoke execute on function public.set_applicant_status(uuid, text, text, text), public.log_applicant_export(int, text)
  from public, anon;
grant execute on function public.set_applicant_status(uuid, text, text, text), public.log_applicant_export(int, text)
  to authenticated;
