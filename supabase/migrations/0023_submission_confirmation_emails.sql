-- =====================================================================
-- 0023_submission_confirmation_emails.sql  |  Email konfirmasi otomatis saat formulir dikirim
--
-- Menjamin email "pengajuan Anda telah kami terima" terkirim untuk:
--   * Pendaftaran Mahasiswa Baru (PMB)        -> applicants
--   * Pendaftaran pengurus DEMA               -> recruitment_applications
--   * Aspirasi yang dikirim saat login (tidak anonim) -> aspirations
--   * Kolaborasi / sponsorship                -> dikirim langsung oleh submit_partnership (0022), bukan trigger
--
-- Penerima: email AKUN pengaju yang sudah dikonfirmasi Supabase Auth (bukan isian bebas di formulir),
-- agar email tidak dapat dipakai mengirim pesan ke alamat orang lain. Aspirasi anonim tidak dikirimi email.
-- Pesan Kontak sengaja tidak dicakup: formulirnya tanpa login dan emailnya belum terverifikasi.
--
-- Trigger dibuat ulang (drop + create dengan nama sama) sehingga aman dijalankan ulang dan tidak ganda.
-- Jalankan SETELAH 0017 dan 0021. Teks email ada di netlify/functions/notify.mjs (objek FORMS).
-- =====================================================================

create or replace function public.notify_submitter() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_cfg private.notify_config;
  v_email text; v_name text; v_ref text; v_form text; v_uid uuid;
begin
  select * into v_cfg from private.notify_config limit 1;
  if v_cfg.url is null then return new; end if;

  if tg_table_name = 'applicants' then
    v_uid := new.user_id; v_name := new.full_name; v_ref := new.registration_no; v_form := 'pmb';
  elsif tg_table_name = 'recruitment_applications' then
    v_uid := new.user_id; v_name := new.full_name; v_ref := new.registration_no; v_form := 'recruitment';
  elsif tg_table_name = 'aspirations' then
    if new.is_anonymous or new.user_id is null then return new; end if;   -- anonim: tidak ada alamat tujuan
    v_uid := new.user_id; v_name := new.submitter_name; v_ref := new.ticket_code; v_form := 'aspiration';
  else
    return new;
  end if;

  select u.email into v_email from auth.users u
   where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then return new; end if;

  perform net.http_post(
    url := v_cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
    body := jsonb_build_object('kind', 'confirmation', 'form', v_form, 'ref', v_ref, 'name', v_name,
                               'recipients', jsonb_build_array(v_email))
  );
  return new;
exception when others then
  return new;   -- notifikasi bersifat upaya terbaik
end $$;

revoke execute on function public.notify_submitter() from public, anon, authenticated;

drop trigger if exists notify_submitter on public.applicants;
drop trigger if exists notify_submitter on public.recruitment_applications;
drop trigger if exists notify_submitter on public.aspirations;
create trigger notify_submitter after insert on public.applicants
  for each row execute function public.notify_submitter();
create trigger notify_submitter after insert on public.recruitment_applications
  for each row execute function public.notify_submitter();
create trigger notify_submitter after insert on public.aspirations
  for each row execute function public.notify_submitter();
