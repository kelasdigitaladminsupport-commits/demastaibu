-- =====================================================================
-- 0022_partnership_email_otp.sql  |  Verifikasi email dengan kode OTP DI DALAM formulir kolaborasi
--
-- Alur baru (menggantikan tautan verifikasi 0017 untuk pengajuan baru):
--   1) Pengaju mengisi email, menekan "Verifikasi email"  -> request_partnership_email_code
--      -> kode 6 digit dikirim ke email itu (berlaku 10 menit).
--   2) Pengaju memasukkan kode di formulir                -> verify_partnership_email_code
--      -> bila benar, server memberi "bukti verifikasi" sekali pakai (berlaku 30 menit).
--   3) Formulir dikirim bersama bukti itu                  -> submit_partnership (13 argumen)
--      -> tanpa bukti yang cocok dengan email, pengajuan DITOLAK ('email_not_verified').
--      -> pengajuan tersimpan dengan email_verified_at terisi, lalu email konfirmasi dikirim.
--
-- Keamanan: kode dan bukti hanya disimpan sebagai hash di skema private (tidak terbaca anon/authenticated);
-- maksimal 5 tebakan per kode; jeda 60 detik dan maksimal 5 kode per jam per email; pembatasan laju per klien.
-- Fungsi verify_partnership_email (tautan lama 0017) dibiarkan agar tautan yang sudah terkirim tetap berfungsi.
-- Jalankan SETELAH 0017 (dan 0014 yang berisi private.notify_config). OTP butuh notify_config terisi (docs/11).
-- =====================================================================

create table if not exists private.partnership_otp (
  email        text primary key,                       -- huruf kecil, tanpa spasi
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     int  not null default 0,
  sent_count   int  not null default 1,
  window_start timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);
create table if not exists private.partnership_email_proofs (
  token_hash text primary key,
  email      text not null,
  expires_at timestamptz not null
);
revoke all on private.partnership_otp, private.partnership_email_proofs from public, anon, authenticated;

-- ---- 1) Minta kode ----
create function public.request_partnership_email_code(p_email text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_cfg private.notify_config; v_row private.partnership_otp; v_code text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then raise exception 'invalid_email'; end if;
  perform public.check_rate_limit('partnership_otp_send', 10, interval '1 hour');

  select * into v_cfg from private.notify_config limit 1;
  if v_cfg.url is null then raise exception 'otp_unavailable'; end if;   -- pengiriman email belum dikonfigurasi

  if random() < 0.02 then
    delete from private.partnership_otp where expires_at < now() - interval '1 day';
    delete from private.partnership_email_proofs where expires_at < now() - interval '1 day';
  end if;

  select * into v_row from private.partnership_otp where email = v_email for update;
  if found then
    if v_row.last_sent_at > now() - interval '60 seconds' then raise exception 'otp_cooldown'; end if;
    if v_row.window_start > now() - interval '1 hour' and v_row.sent_count >= 5 then raise exception 'rate_limit_exceeded'; end if;
  end if;

  v_code := lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');

  insert into private.partnership_otp(email, code_hash, expires_at, attempts, sent_count, window_start, last_sent_at)
  values (v_email, encode(digest(v_email || ':' || v_code, 'sha256'), 'hex'), now() + interval '10 minutes', 0, 1, now(), now())
  on conflict (email) do update set
    code_hash    = excluded.code_hash,
    expires_at   = excluded.expires_at,
    attempts     = 0,
    sent_count   = case when private.partnership_otp.window_start > now() - interval '1 hour'
                        then private.partnership_otp.sent_count + 1 else 1 end,
    window_start = case when private.partnership_otp.window_start > now() - interval '1 hour'
                        then private.partnership_otp.window_start else now() end,
    last_sent_at = now();

  perform net.http_post(
    url := v_cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
    body := jsonb_build_object('kind', 'otp_email', 'form', 'partnership', 'code', v_code,
                               'recipients', jsonb_build_array(v_email))
  );
end $$;

-- ---- 2) Periksa kode ----
-- Mengembalikan jsonb (bukan raise) pada kode salah, agar penambahan jumlah percobaan tidak ikut dibatalkan.
create function public.verify_partnership_email_code(p_email text, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row private.partnership_otp; v_token text;
begin
  perform public.check_rate_limit('partnership_otp_verify', 30, interval '1 hour');
  if p_code is null or p_code !~ '^[0-9]{6}$' then return jsonb_build_object('verified', false, 'reason', 'invalid'); end if;

  select * into v_row from private.partnership_otp where email = v_email for update;
  if not found or v_row.expires_at <= now() then return jsonb_build_object('verified', false, 'reason', 'expired'); end if;
  if v_row.attempts >= 5 then return jsonb_build_object('verified', false, 'reason', 'locked'); end if;

  if v_row.code_hash <> encode(digest(v_email || ':' || p_code, 'sha256'), 'hex') then
    update private.partnership_otp set attempts = attempts + 1 where email = v_email;
    return jsonb_build_object('verified', false, 'reason', case when v_row.attempts + 1 >= 5 then 'locked' else 'invalid' end);
  end if;

  delete from private.partnership_otp where email = v_email;            -- kode sekali pakai
  v_token := encode(gen_random_bytes(24), 'hex');                       -- 48 karakter heksadesimal
  insert into private.partnership_email_proofs(token_hash, email, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_email, now() + interval '30 minutes');
  return jsonb_build_object('verified', true, 'token', v_token);
end $$;

-- ---- 3) Kirim pengajuan: wajib membawa bukti verifikasi email ----
drop function if exists public.submit_partnership(text,text,text,text,text,text,text,text,numeric,text,boolean,text);

create function public.submit_partnership(
  p_org_name text, p_contact_person text, p_email text, p_phone text,
  p_partner_type text, p_cooperation_type text, p_supported_program text,
  p_support_form text, p_support_value numeric, p_message text,
  p_publish_consent boolean default false, p_proposal_path text default null,
  p_email_proof text default null
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ref text; v_id uuid; v_try int := 0; v_cfg private.notify_config;
  v_email text := lower(btrim(coalesce(p_email, ''))); v_hash text;
begin
  perform public.check_rate_limit('partnership', 3, interval '1 day');
  if p_proposal_path is not null and p_proposal_path not like 'incoming/%' then
    raise exception 'invalid_proposal_path' using errcode = '42501';
  end if;

  -- Bukti verifikasi harus valid, belum kedaluwarsa, dan milik email yang sama.
  if p_email_proof is null or p_email_proof !~ '^[0-9a-f]{48}$' then raise exception 'email_not_verified'; end if;
  v_hash := encode(digest(p_email_proof, 'sha256'), 'hex');
  if not exists (select 1 from private.partnership_email_proofs
                  where token_hash = v_hash and email = v_email and expires_at > now()) then
    raise exception 'email_not_verified';
  end if;

  loop
    v_ref := public.gen_code('KRJ', 8);
    begin
      insert into public.partnership_requests(reference_no, org_name, contact_person, email, phone,
        partner_type, cooperation_type, supported_program, support_form, support_value, message,
        proposal_path, publish_consent, email_verified_at)
      values (v_ref, btrim(p_org_name), btrim(p_contact_person), btrim(p_email), nullif(btrim(p_phone),''),
        p_partner_type, btrim(p_cooperation_type), nullif(btrim(p_supported_program),''),
        nullif(btrim(p_support_form),''), p_support_value, btrim(p_message),
        p_proposal_path, coalesce(p_publish_consent, false), now())
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;

  delete from private.partnership_email_proofs where token_hash = v_hash;   -- bukti sekali pakai

  -- Email konfirmasi (upaya terbaik: kegagalan tidak membatalkan pengiriman formulir).
  begin
    select * into v_cfg from private.notify_config limit 1;
    if v_cfg.url is not null then
      perform net.http_post(
        url := v_cfg.url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_cfg.secret),
        body := jsonb_build_object('kind', 'confirmation', 'form', 'partnership', 'ref', v_ref,
                                   'name', btrim(p_contact_person), 'recipients', jsonb_build_array(btrim(p_email)))
      );
    end if;
  exception when others then null;
  end;
  return v_ref;
end $$;

revoke execute on function
  public.request_partnership_email_code(text),
  public.verify_partnership_email_code(text, text),
  public.submit_partnership(text,text,text,text,text,text,text,text,numeric,text,boolean,text,text)
from public, anon, authenticated;
grant execute on function
  public.request_partnership_email_code(text),
  public.verify_partnership_email_code(text, text),
  public.submit_partnership(text,text,text,text,text,text,text,text,numeric,text,boolean,text,text)
to anon, authenticated;
