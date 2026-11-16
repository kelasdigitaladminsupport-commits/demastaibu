-- =====================================================================
-- 0017_email_verification.sql  |  Verifikasi email sebelum email konfirmasi dikirim
--
-- Masalah: formulir kolaborasi bisa diisi TANPA login, sehingga seseorang dapat memasukkan
-- email orang lain dan memicu email konfirmasi ke alamat itu.
--
-- Perbaikan:
--  * KOLABORASI (anonim): email konfirmasi TIDAK lagi dikirim saat formulir masuk. Yang dikirim
--    hanya email "verifikasi" berisi tautan satu-kali (berlaku 3 hari). Konfirmasi baru dikirim
--    setelah pemilik email menekan tombol verifikasi. Penyimpanan hanya berupa hash token.
--  * PMB dan PENDAFTARAN PENGURUS (wajib login): konfirmasi dikirim ke email AKUN yang sudah
--    terverifikasi oleh Supabase Auth (email_confirmed_at terisi), bukan ke isian bebas di formulir.
-- Jalankan SETELAH 0016.
-- =====================================================================

alter table public.partnership_requests add column email_verified_at timestamptz;

create table if not exists private.partnership_email_tokens (
  request_id uuid primary key references public.partnership_requests(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null
);
revoke all on private.partnership_email_tokens from public, anon, authenticated;
create index if not exists partnership_email_tokens_hash_idx on private.partnership_email_tokens(token_hash);

-- ---- 1) PMB & pengurus: kirim ke email akun yang terverifikasi ----
drop trigger if exists notify_submitter on public.partnership_requests;

create or replace function public.notify_submitter() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_cfg private.notify_config;
  v_email text; v_name text; v_ref text; v_form text;
begin
  select * into v_cfg from private.notify_config limit 1;
  if v_cfg.url is null then return new; end if;

  if tg_table_name = 'applicants' then
    v_name := new.full_name; v_ref := new.registration_no; v_form := 'pmb';
  elsif tg_table_name = 'recruitment_applications' then
    v_name := new.full_name; v_ref := new.registration_no; v_form := 'recruitment';
  else
    return new;
  end if;

  -- Hanya alamat email akun yang sudah dikonfirmasi pemiliknya.
  select u.email into v_email from auth.users u
   where u.id = new.user_id and u.email_confirmed_at is not null;
  if v_email is null then return new; end if;

  perform net.http_post(
    url := v_cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
    body := jsonb_build_object('kind', 'confirmation', 'form', v_form, 'ref', v_ref, 'name', v_name,
                               'recipients', jsonb_build_array(v_email))
  );
  return new;
exception when others then
  return new;
end $$;

-- ---- 2) Kolaborasi: kirim email verifikasi (bukan konfirmasi) saat formulir masuk ----
create or replace function public.submit_partnership(
  p_org_name text, p_contact_person text, p_email text, p_phone text,
  p_partner_type text, p_cooperation_type text, p_supported_program text,
  p_support_form text, p_support_value numeric, p_message text,
  p_publish_consent boolean default false, p_proposal_path text default null
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ref text; v_id uuid; v_try int := 0; v_token text; v_cfg private.notify_config;
begin
  perform public.check_rate_limit('partnership', 3, interval '1 day');
  if p_proposal_path is not null and p_proposal_path not like 'incoming/%' then
    raise exception 'invalid_proposal_path' using errcode = '42501';
  end if;
  loop
    v_ref := public.gen_code('KRJ', 8);
    begin
      insert into public.partnership_requests(reference_no, org_name, contact_person, email, phone,
        partner_type, cooperation_type, supported_program, support_form, support_value, message,
        proposal_path, publish_consent)
      values (v_ref, btrim(p_org_name), btrim(p_contact_person), btrim(p_email), nullif(btrim(p_phone),''),
        p_partner_type, btrim(p_cooperation_type), nullif(btrim(p_supported_program),''),
        nullif(btrim(p_support_form),''), p_support_value, btrim(p_message),
        p_proposal_path, coalesce(p_publish_consent, false))
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;

  -- Email verifikasi (upaya terbaik: kegagalan tidak membatalkan pengiriman formulir).
  begin
    select * into v_cfg from private.notify_config limit 1;
    if v_cfg.url is not null then
      v_token := encode(gen_random_bytes(24), 'hex');            -- 48 karakter heksadesimal
      insert into private.partnership_email_tokens(request_id, token_hash, expires_at)
      values (v_id, encode(digest(v_token, 'sha256'), 'hex'), now() + interval '3 days');
      perform net.http_post(
        url := v_cfg.url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
        body := jsonb_build_object('kind', 'verify_email', 'form', 'partnership', 'ref', v_ref,
                                   'name', btrim(p_contact_person), 'token', v_token,
                                   'recipients', jsonb_build_array(btrim(p_email)))
      );
    end if;
  exception when others then null;
  end;
  return v_ref;
end $$;

-- ---- 3) Verifikasi: dipanggil halaman /kolaborasi/verifikasi saat tombol ditekan ----
create function public.verify_partnership_email(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid; v_ref text; v_name text; v_email text; v_cfg private.notify_config; v_already boolean := false;
begin
  perform public.check_rate_limit('verify_partnership_email', 20, interval '1 hour');
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then raise exception 'invalid_token'; end if;

  select t.request_id into v_id from private.partnership_email_tokens t
   where t.token_hash = encode(digest(p_token, 'sha256'), 'hex') and t.expires_at > now();
  if v_id is null then raise exception 'invalid_token'; end if;

  select reference_no, contact_person, email, email_verified_at is not null
    into v_ref, v_name, v_email, v_already
    from public.partnership_requests where id = v_id;

  update public.partnership_requests set email_verified_at = coalesce(email_verified_at, now()) where id = v_id;
  delete from private.partnership_email_tokens where request_id = v_id;

  -- Konfirmasi dikirim SETELAH email terbukti milik pengirim (sekali saja).
  if not v_already then
    begin
      select * into v_cfg from private.notify_config limit 1;
      if v_cfg.url is not null then
        perform net.http_post(
          url := v_cfg.url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
          body := jsonb_build_object('kind', 'confirmation', 'form', 'partnership', 'ref', v_ref,
                                     'name', v_name, 'recipients', jsonb_build_array(v_email))
        );
      end if;
    exception when others then null;
    end;
  end if;
  return jsonb_build_object('reference_no', v_ref);
end $$;

revoke execute on function public.notify_submitter() from public, anon, authenticated;
revoke execute on function public.verify_partnership_email(text) from public, anon, authenticated;
grant  execute on function public.verify_partnership_email(text) to anon, authenticated;
-- Hak EXECUTE submit_partnership (anon, authenticated) tidak berubah karena fungsi hanya diganti isinya.
