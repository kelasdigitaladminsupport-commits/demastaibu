-- =====================================================================
-- 0021_status_change_emails.sql  |  Email otomatis ke pengaju saat admin mengubah status
--
-- Cakupan:
--   * Pendaftaran Mahasiswa Baru (PMB)      -> applicant_status_histories (AFTER INSERT)
--   * Pendaftaran pengurus DEMA             -> recruitment_applications   (AFTER UPDATE OF status)
--   * Pengajuan kolaborasi / sponsorship    -> partnership_requests       (AFTER UPDATE OF status)
--   * Aspirasi (hanya yang dikirim saat login, tidak anonim) -> aspirations (AFTER UPDATE OF status)
--
-- Penerima (sama dengan prinsip 0017, agar email tidak bisa disalahgunakan ke alamat orang lain):
--   * PMB, pengurus, aspirasi : email AKUN pengaju yang sudah dikonfirmasi Supabase Auth.
--   * Kolaborasi (tanpa login): email di formulir, HANYA bila sudah terverifikasi (email_verified_at terisi).
--
-- Catatan desain:
--   * PMB memakai tabel riwayat (bukan tabel applicants) karena catatan untuk pendaftar
--     (note_public) baru tersimpan di riwayat, setelah status diubah oleh RPC set_applicant_status.
--   * Status awal (submitted / received) tidak memicu email: konfirmasi pengiriman sudah ada (0016/0017).
--   * Teks email ditentukan di fungsi Netlify "notify" (bukan dari database), hanya kunci status yang dikirim.
--   * pg_net mengirim SETELAH transaksi commit; bila perubahan dibatalkan, email tidak terkirim.
--   * Upaya terbaik: kegagalan kirim tidak pernah menggagalkan perubahan status oleh admin.
-- Jalankan SETELAH 0014, 0017, dan 0020. Aktif bila private.notify_config sudah terisi (docs/11).
-- =====================================================================

create or replace function public.notify_status_change() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_cfg private.notify_config;
  v_form text; v_status text; v_ref text; v_name text; v_note text;
  v_uid uuid; v_email text;
begin
  select * into v_cfg from private.notify_config limit 1;
  if v_cfg.url is null then return new; end if;

  if tg_table_name = 'applicant_status_histories' then
    -- status_from null = riwayat awal saat mendaftar; status sama = hanya catatan yang diperbarui.
    if new.status_from is null or new.status_from is not distinct from new.status_to then return new; end if;
    select a.user_id, a.full_name, a.registration_no into v_uid, v_name, v_ref
      from public.applicants a where a.id = new.applicant_id;
    v_form := 'pmb'; v_status := new.status_to; v_note := new.note_public;

  elsif tg_table_name = 'recruitment_applications' then
    if new.status is not distinct from old.status then return new; end if;
    v_uid := new.user_id; v_name := new.full_name; v_ref := new.registration_no;
    v_form := 'recruitment'; v_status := new.status; v_note := new.note_public;

  elsif tg_table_name = 'aspirations' then
    if new.status is not distinct from old.status then return new; end if;
    if new.is_anonymous or new.user_id is null then return new; end if;   -- anonim: tidak ada alamat tujuan
    v_uid := new.user_id; v_name := new.submitter_name; v_ref := new.ticket_code;
    v_form := 'aspiration'; v_status := new.status; v_note := new.public_response;

  elsif tg_table_name = 'partnership_requests' then
    if new.status is not distinct from old.status then return new; end if;
    if new.email_verified_at is null then return new; end if;             -- email belum terbukti milik pengaju
    v_email := new.email; v_name := new.contact_person; v_ref := new.reference_no;
    v_form := 'partnership'; v_status := new.status; v_note := null;

  else
    return new;
  end if;

  if v_status in ('submitted', 'received') then return new; end if;       -- status awal: tanpa email

  if v_email is null then
    select u.email into v_email from auth.users u
     where u.id = v_uid and u.email_confirmed_at is not null;
  end if;
  if v_email is null then return new; end if;

  perform net.http_post(
    url := v_cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
    body := jsonb_build_object('kind', 'status_update', 'form', v_form, 'status', v_status,
                               'ref', v_ref, 'name', v_name, 'note', left(nullif(btrim(v_note), ''), 1000),
                               'recipients', jsonb_build_array(v_email))
  );
  return new;
exception when others then
  return new;   -- notifikasi bersifat upaya terbaik
end $$;

revoke execute on function public.notify_status_change() from public, anon, authenticated;

drop trigger if exists notify_status_change on public.applicant_status_histories;
drop trigger if exists notify_status_change on public.recruitment_applications;
drop trigger if exists notify_status_change on public.partnership_requests;
drop trigger if exists notify_status_change on public.aspirations;

create trigger notify_status_change after insert on public.applicant_status_histories
  for each row execute function public.notify_status_change();
create trigger notify_status_change after update of status on public.recruitment_applications
  for each row execute function public.notify_status_change();
create trigger notify_status_change after update of status on public.partnership_requests
  for each row execute function public.notify_status_change();
create trigger notify_status_change after update of status on public.aspirations
  for each row execute function public.notify_status_change();
