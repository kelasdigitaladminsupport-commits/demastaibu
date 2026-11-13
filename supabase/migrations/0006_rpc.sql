-- =====================================================================
-- 0006_rpc.sql  |  Fungsi RPC untuk aksi publik yang harus dibatasi:
--   kirim aspirasi / pesan kontak / kemitraan, pelacakan, pendaftaran PMB.
-- Semua berjalan SECURITY DEFINER dengan validasi + rate limit sendiri.
-- Tabel-tabel tujuan TIDAK punya policy INSERT untuk anon/authenticated.
-- =====================================================================

-- ---------------------------- ASPIRASI -------------------------------
create function public.submit_aspiration(
  p_title text, p_content text, p_category text,
  p_is_anonymous boolean default true,
  p_name text default null, p_contact text default null,
  p_attachment_path text default null
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_code text; v_try int := 0;
begin
  if not coalesce((select value = 'true'::jsonb from public.site_settings where key='aspiration_enabled'), true) then
    raise exception 'aspiration_closed';
  end if;
  perform public.check_rate_limit('aspiration', 5, interval '1 hour');

  if p_attachment_path is not null then
    if p_is_anonymous then raise exception 'anonymous_attachment_not_allowed'; end if;
    if v_uid is null or split_part(p_attachment_path, '/', 1) <> v_uid::text then
      raise exception 'invalid_attachment' using errcode = '42501';
    end if;
  end if;
  if p_is_anonymous then p_name := null; p_contact := null; v_uid := null; end if;

  loop
    v_code := public.gen_code('ASP', 8);
    begin
      insert into public.aspirations(ticket_code, user_id, category, title, content, is_anonymous,
                                     submitter_name, submitter_contact, attachment_path)
      values (v_code, v_uid, p_category, btrim(p_title), btrim(p_content), p_is_anonymous,
              nullif(btrim(p_name),''), nullif(btrim(p_contact),''), p_attachment_path);
      exit;
    exception when unique_violation then
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;
  return v_code;
end $$;

create function public.track_aspiration(p_ticket text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.aspirations;
begin
  perform public.check_rate_limit('track_aspiration', 20, interval '10 minutes');
  select * into r from public.aspirations where ticket_code = upper(btrim(p_ticket));
  if not found then return null; end if;
  return jsonb_build_object(
    'ticket_code', r.ticket_code, 'category', r.category, 'title', r.title,
    'status', r.status, 'status_reason', r.status_reason,
    'public_response', r.public_response, 'created_at', r.created_at, 'updated_at', r.updated_at,
    'history', coalesce((select jsonb_agg(jsonb_build_object(
                  'note', u.note, 'status', u.status_to, 'at', u.created_at) order by u.created_at)
                 from public.aspiration_updates u
                 where u.aspiration_id = r.id and not u.is_internal), '[]'::jsonb));
end $$;

-- ---------------------------- KONTAK ---------------------------------
create function public.submit_contact_message(p_name text, p_email text, p_subject text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.check_rate_limit('contact', 3, interval '1 hour');
  insert into public.contact_messages(name, email, subject, message)
  values (btrim(p_name), btrim(p_email), btrim(p_subject), btrim(p_message));
end $$;

-- --------------------------- KEMITRAAN -------------------------------
create function public.submit_partnership(
  p_org_name text, p_contact_person text, p_email text, p_phone text,
  p_partner_type text, p_cooperation_type text, p_supported_program text,
  p_support_form text, p_support_value numeric, p_message text,
  p_publish_consent boolean default false, p_proposal_path text default null
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_ref text; v_try int := 0;
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
        p_proposal_path, coalesce(p_publish_consent, false));
      exit;
    exception when unique_violation then
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;
  return v_ref;
end $$;

create function public.track_partnership(p_ref text, p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.partnership_requests;
begin
  perform public.check_rate_limit('track_partnership', 20, interval '10 minutes');
  select * into r from public.partnership_requests
   where reference_no = upper(btrim(p_ref)) and lower(email) = lower(btrim(p_email));
  if not found then return null; end if;
  return jsonb_build_object(
    'reference_no', r.reference_no, 'org_name', r.org_name, 'status', r.status,
    'created_at', r.created_at, 'updated_at', r.updated_at,
    'history', coalesce((select jsonb_agg(jsonb_build_object(
                  'note', u.note, 'status', u.status_to, 'at', u.created_at) order by u.created_at)
                 from public.partnership_updates u
                 where u.request_id = r.id and not u.is_internal), '[]'::jsonb));
end $$;

-- ------------------------------ PMB ----------------------------------
create function public.submit_applicant(
  p_period_id uuid, p_program_id uuid, p_full_name text, p_birth_place text,
  p_birth_date date, p_gender text, p_email text, p_phone text, p_address text,
  p_previous_school text, p_graduation_year int,
  p_guardian_name text default null, p_guardian_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_reg text; v_track text; v_id uuid; v_try int := 0;
begin
  if v_uid is null then raise exception 'login_required' using errcode = '28000'; end if;
  if public.is_banned() then raise exception 'account_banned' using errcode = '42501'; end if;
  if not public.pmb_enabled() then raise exception 'pmb_closed'; end if;
  perform public.check_rate_limit('submit_applicant', 5, interval '1 day');

  if not exists (select 1 from public.pmb_periods
                 where id = p_period_id and is_active and current_date between start_date and end_date) then
    raise exception 'pmb_period_closed';
  end if;
  if not exists (select 1 from public.study_programs where id = p_program_id and is_active) then
    raise exception 'invalid_program';
  end if;
  if exists (select 1 from public.applicants where user_id = v_uid and period_id = p_period_id) then
    raise exception 'already_registered';
  end if;

  v_track := public.gen_code('TRK', 10);
  loop
    v_reg := public.gen_code('PMB' || to_char(current_date, 'YYYY'), 6);
    begin
      insert into public.applicants(registration_no, tracking_hash, user_id, period_id, program_id,
        full_name, birth_place, birth_date, gender, email, phone, address,
        previous_school, graduation_year, guardian_name, guardian_phone)
      values (v_reg, encode(digest(v_track, 'sha256'), 'hex'), v_uid, p_period_id, p_program_id,
        btrim(p_full_name), nullif(btrim(p_birth_place),''), p_birth_date, p_gender, btrim(p_email),
        nullif(btrim(p_phone),''), nullif(btrim(p_address),''), nullif(btrim(p_previous_school),''),
        p_graduation_year, nullif(btrim(p_guardian_name),''), nullif(btrim(p_guardian_phone),''))
      returning id into v_id;
      exit;
    exception when unique_violation then
      if exists (select 1 from public.applicants where user_id = v_uid and period_id = p_period_id) then
        raise exception 'already_registered';
      end if;
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;

  insert into public.applicant_status_histories(applicant_id, status_from, status_to, changed_by)
  values (v_id, null, 'submitted', v_uid);

  -- Kode pelacakan hanya ditampilkan SEKALI di sini; yang tersimpan hanya hash-nya.
  return jsonb_build_object('id', v_id, 'registration_no', v_reg, 'tracking_code', v_track);
end $$;

create function public.track_applicant(p_reg text, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.applicants;
begin
  perform public.check_rate_limit('track_applicant', 20, interval '10 minutes');
  select * into a from public.applicants
   where registration_no = upper(btrim(p_reg))
     and tracking_hash = encode(digest(upper(btrim(p_code)), 'sha256'), 'hex');
  if not found then return null; end if;
  return jsonb_build_object(
    'registration_no', a.registration_no, 'status', a.status, 'submitted_at', a.created_at,
    'period', (select name from public.pmb_periods where id = a.period_id),
    'program', (select name from public.study_programs where id = a.program_id),
    'history', coalesce((select jsonb_agg(jsonb_build_object(
                  'status', h.status_to, 'note', h.note_public, 'at', h.created_at) order by h.created_at)
                 from public.applicant_status_histories h where h.applicant_id = a.id), '[]'::jsonb));
end $$;

-- Pendaftar yang login melihat riwayatnya sendiri (tanpa catatan internal)
create function public.my_applicant_history(p_applicant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.applicants where id = p_applicant_id and user_id = auth.uid()) then
    return null;
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
            'status', h.status_to, 'note', h.note_public, 'at', h.created_at) order by h.created_at)
          from public.applicant_status_histories h where h.applicant_id = p_applicant_id), '[]'::jsonb);
end $$;

-- ------------------------------ GRANT --------------------------------
-- Default Supabase memberi EXECUTE ke anon/authenticated; kita cabut lalu beri eksplisit.
revoke execute on function
  public.submit_aspiration(text,text,text,boolean,text,text,text),
  public.track_aspiration(text),
  public.submit_contact_message(text,text,text,text),
  public.submit_partnership(text,text,text,text,text,text,text,text,numeric,text,boolean,text),
  public.track_partnership(text,text),
  public.submit_applicant(uuid,uuid,text,text,date,text,text,text,text,text,int,text,text),
  public.track_applicant(text,text),
  public.my_applicant_history(uuid)
from public, anon, authenticated;

grant execute on function
  public.submit_aspiration(text,text,text,boolean,text,text,text),
  public.track_aspiration(text),
  public.submit_contact_message(text,text,text,text),
  public.submit_partnership(text,text,text,text,text,text,text,text,numeric,text,boolean,text),
  public.track_partnership(text,text),
  public.track_applicant(text,text)
to anon, authenticated;

grant execute on function
  public.submit_applicant(uuid,uuid,text,text,date,text,text,text,text,text,int,text,text),
  public.my_applicant_history(uuid)
to authenticated;

-- Fungsi internal: tidak boleh dipanggil langsung dari API
revoke execute on function
  public.client_key(), public.check_rate_limit(text,int,interval), public.gen_code(text,int),
  public.audit_row(), public.handle_new_user(), public.guard_profile_update(),
  public.guard_forum_topic(), public.guard_forum_comment(), public.sponsor_requires_consent(),
  public.log_applicant_status(), public.guard_applicant_update()
from public, anon, authenticated;
