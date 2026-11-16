-- =====================================================================
-- 0015_pmb_class_schedule.sql  |  Pilihan jadwal perkuliahan pada pendaftaran PMB
--   'day'   = kelas Siang  (14.00 - 18.00 WIB)
--   'night' = kelas Malam  (18.00 - 21.00 WIB)
-- Kolom boleh NULL hanya untuk pendaftar lama (sebelum fitur ini ada).
-- Pendaftaran baru WAJIB memilih jadwal (ditegakkan di submit_applicant).
-- =====================================================================

alter table public.applicants
  add column class_schedule text check (class_schedule in ('day', 'night'));

create index applicants_schedule_idx on public.applicants(period_id, class_schedule);

-- Ganti fungsi lama (13 argumen) dengan versi baru (14 argumen) agar tidak ada
-- dua versi yang ambigu dan tidak ada jalan pintas tanpa memilih jadwal.
drop function public.submit_applicant(uuid, uuid, text, text, date, text, text, text, text, text, int, text, text);

create function public.submit_applicant(
  p_period_id uuid, p_program_id uuid, p_full_name text, p_birth_place text,
  p_birth_date date, p_gender text, p_email text, p_phone text, p_address text,
  p_previous_school text, p_graduation_year int,
  p_guardian_name text default null, p_guardian_phone text default null,
  p_class_schedule text default null
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
  if p_class_schedule is null or p_class_schedule not in ('day', 'night') then
    raise exception 'invalid_schedule';
  end if;

  v_track := public.gen_code('TRK', 10);
  loop
    v_reg := public.gen_code('PMB' || to_char(current_date, 'YYYY'), 6);
    begin
      insert into public.applicants(registration_no, tracking_hash, user_id, period_id, program_id,
        full_name, birth_place, birth_date, gender, email, phone, address,
        previous_school, graduation_year, guardian_name, guardian_phone, class_schedule)
      values (v_reg, encode(digest(v_track, 'sha256'), 'hex'), v_uid, p_period_id, p_program_id,
        btrim(p_full_name), nullif(btrim(p_birth_place),''), p_birth_date, p_gender, btrim(p_email),
        nullif(btrim(p_phone),''), nullif(btrim(p_address),''), nullif(btrim(p_previous_school),''),
        p_graduation_year, nullif(btrim(p_guardian_name),''), nullif(btrim(p_guardian_phone),''),
        p_class_schedule)
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

revoke execute on function
  public.submit_applicant(uuid,uuid,text,text,date,text,text,text,text,text,int,text,text,text)
from public, anon, authenticated;
grant execute on function
  public.submit_applicant(uuid,uuid,text,text,date,text,text,text,text,text,int,text,text,text)
to authenticated;
