-- =====================================================================
-- 0014_staff_email_notifications.sql
-- Notifikasi email ke staf saat ada: aspirasi, pesan kontak, permohonan kemitraan,
-- pendaftar PMB, pendaftar pengurus. Dikirim lewat fungsi Netlify "notify" -> Resend.
-- Isi email HANYA memuat jenis + nomor referensi + tautan dasbor (tanpa data pribadi).
-- Jalankan SETELAH 0013. Notifikasi baru aktif setelah baris config diisi (docs/11).
-- Kegagalan kirim tidak pernah menggagalkan pengiriman formulir oleh pengguna.
-- =====================================================================
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.notify_config (
  id     boolean primary key default true check (id),   -- satu baris saja
  url    text not null,                                   -- https://SITUS.netlify.app/.netlify/functions/notify
  secret text not null                                    -- sama dengan NOTIFY_WEBHOOK_SECRET di Netlify
);
revoke all on private.notify_config from public, anon, authenticated;

create function public.notify_staff() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_cfg private.notify_config;
  v_roles public.app_role[]; v_emails text[];
  v_label text; v_path text; v_ref text;
begin
  select * into v_cfg from private.notify_config limit 1;
  if v_cfg.url is null then return new; end if;

  if tg_table_name = 'aspirations' then
    v_roles := array['super_admin','admin','moderator']::public.app_role[];
    v_label := 'Aspirasi baru'; v_path := '/admin/aspirasi'; v_ref := new.ticket_code;
  elsif tg_table_name = 'contact_messages' then
    v_roles := array['super_admin','admin']::public.app_role[];
    v_label := 'Pesan kontak baru'; v_path := '/admin/kontak'; v_ref := null;
  elsif tg_table_name = 'partnership_requests' then
    v_roles := array['super_admin','admin']::public.app_role[];
    v_label := 'Permohonan kemitraan baru'; v_path := '/admin/sponsorship'; v_ref := new.reference_no;
  elsif tg_table_name = 'applicants' then
    v_roles := array['super_admin','pmb_officer']::public.app_role[];
    v_label := 'Pendaftar PMB baru'; v_path := '/admin/pmb'; v_ref := new.registration_no;
  elsif tg_table_name = 'recruitment_applications' then
    v_roles := array['super_admin','admin']::public.app_role[];
    v_label := 'Pendaftar pengurus baru'; v_path := '/admin/rekrutmen'; v_ref := new.registration_no;
  else
    return new;
  end if;

  select coalesce(array_agg(distinct p.email), '{}') into v_emails
    from public.user_roles ur join public.profiles p on p.id = ur.user_id
   where ur.role = any(v_roles) and p.email is not null and not p.is_banned;
  if cardinality(v_emails) = 0 then return new; end if;

  perform net.http_post(
    url := v_cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
    body := jsonb_build_object('label', v_label, 'ref', v_ref, 'path', v_path, 'recipients', to_jsonb(v_emails))
  );
  return new;
exception when others then
  return new;   -- notifikasi bersifat upaya terbaik
end $$;

revoke execute on function public.notify_staff() from public, anon, authenticated;

create trigger notify_staff after insert on public.aspirations              for each row execute function public.notify_staff();
create trigger notify_staff after insert on public.contact_messages         for each row execute function public.notify_staff();
create trigger notify_staff after insert on public.partnership_requests     for each row execute function public.notify_staff();
create trigger notify_staff after insert on public.applicants               for each row execute function public.notify_staff();
create trigger notify_staff after insert on public.recruitment_applications for each row execute function public.notify_staff();
