-- =====================================================================
-- 0020_recruitment_positions.sql  |  Dua jalur pendaftaran kepengurusan DEMA
--   Jalur PIMPINAN : Ketua DEMA, Wakil Ketua DEMA   -> visi-misi + program kerja + pengalaman WAJIB, tanpa pilihan bidang
--   Jalur BIDANG   : Koordinator Bidang, Anggota    -> pilih bidang (anggota: pilihan ke-2 opsional), seperti sebelumnya
-- Persyaratan Ketua/Wakil dapat dibedakan (kolom leadership_requirements di periode rekrutmen).
-- Jalankan SETELAH 0013. Pendaftar lama otomatis berposisi 'anggota'. Satu akun tetap hanya
-- boleh satu pendaftaran per periode (unique user_id + period_id).
-- =====================================================================

alter table public.recruitment_periods
  add column leadership_requirements text;   -- SATU syarat per baris, khusus calon Ketua & Wakil Ketua

alter table public.recruitment_applications
  add column position text not null default 'anggota'
    check (position in ('ketua', 'wakil', 'koordinator', 'anggota')),
  add column vision_mission text check (char_length(vision_mission) <= 4000),
  add column work_program   text check (char_length(work_program) <= 4000);

create index recruitment_apps_position_idx on public.recruitment_applications(period_id, position);

-- Ganti fungsi lama (12 argumen) dengan versi 15 argumen. Argumen baru berdefault, sehingga
-- pemanggil lama tetap valid dan dianggap mendaftar sebagai 'anggota'.
drop function public.submit_recruitment(uuid,uuid,uuid,text,text,text,int,text,text,text,text,boolean);

create function public.submit_recruitment(
  p_period_id uuid, p_first_department_id uuid, p_second_department_id uuid,
  p_full_name text, p_nim text, p_study_program text, p_semester int,
  p_email text, p_phone text, p_motivation text, p_experience text,
  p_requirements_confirmed boolean,
  p_position text default 'anggota', p_vision_mission text default null, p_work_program text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid(); v_reg text; v_id uuid; v_try int := 0;
  v_pos text := coalesce(nullif(btrim(p_position), ''), 'anggota');
  v_leader boolean; v_first uuid; v_second uuid; v_vm text; v_wp text;
begin
  if v_uid is null then raise exception 'login_required' using errcode = '28000'; end if;
  if public.is_banned() then raise exception 'account_banned' using errcode = '42501'; end if;
  perform public.check_rate_limit('submit_recruitment', 5, interval '1 day');

  if v_pos not in ('ketua', 'wakil', 'koordinator', 'anggota') then raise exception 'invalid_position'; end if;
  v_leader := v_pos in ('ketua', 'wakil');

  if not coalesce(p_requirements_confirmed, false) then raise exception 'requirements_not_confirmed'; end if;
  if not exists (select 1 from public.recruitment_periods
                 where id = p_period_id and is_active and current_date between start_date and end_date) then
    raise exception 'recruitment_closed';
  end if;

  if v_leader then
    -- Jalur pimpinan: tanpa bidang; visi-misi, program kerja, dan pengalaman wajib.
    v_vm := nullif(btrim(coalesce(p_vision_mission, '')), '');
    v_wp := nullif(btrim(coalesce(p_work_program, '')), '');
    if char_length(coalesce(v_vm, '')) < 30 or char_length(coalesce(v_wp, '')) < 30 then
      raise exception 'leadership_fields_required';
    end if;
    if char_length(btrim(coalesce(p_experience, ''))) < 20 then raise exception 'experience_required'; end if;
    v_first := null; v_second := null;
  else
    -- Jalur bidang: bidang pertama wajib; pilihan kedua hanya untuk anggota.
    v_first := p_first_department_id;
    v_second := case when v_pos = 'anggota' then p_second_department_id else null end;
    v_vm := null; v_wp := null;
    if v_first is null or not exists (select 1 from public.departments where id = v_first) then
      raise exception 'invalid_department';
    end if;
    if v_second is not null then
      if v_second = v_first or not exists (select 1 from public.departments where id = v_second) then
        raise exception 'invalid_department';
      end if;
    end if;
  end if;

  if exists (select 1 from public.recruitment_applications where user_id = v_uid and period_id = p_period_id) then
    raise exception 'already_registered';
  end if;

  loop
    v_reg := public.gen_code('REK' || to_char(current_date, 'YYYY'), 6);
    begin
      insert into public.recruitment_applications(registration_no, user_id, period_id,
        first_department_id, second_department_id, full_name, nim, study_program, semester,
        email, phone, motivation, experience, requirements_confirmed, position, vision_mission, work_program)
      values (v_reg, v_uid, p_period_id, v_first, v_second,
        btrim(p_full_name), btrim(p_nim), nullif(btrim(p_study_program), ''), p_semester,
        btrim(p_email), btrim(p_phone), btrim(p_motivation), nullif(btrim(p_experience), ''), true,
        v_pos, v_vm, v_wp)
      returning id into v_id;
      exit;
    exception when unique_violation then
      if exists (select 1 from public.recruitment_applications where user_id = v_uid and period_id = p_period_id) then
        raise exception 'already_registered';
      end if;
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;

  return jsonb_build_object('id', v_id, 'registration_no', v_reg, 'position', v_pos);
end $$;

revoke execute on function
  public.submit_recruitment(uuid,uuid,uuid,text,text,text,int,text,text,text,text,boolean,text,text,text)
from public, anon, authenticated;
grant execute on function
  public.submit_recruitment(uuid,uuid,uuid,text,text,text,int,text,text,text,text,boolean,text,text,text)
to authenticated;
