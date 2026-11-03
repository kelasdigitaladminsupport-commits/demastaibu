-- =====================================================================
-- 0004_pmb.sql  |  Penerimaan mahasiswa baru (nonaktif sampai saklar
--                  site_settings.pmb_enabled = true)
-- Tidak ada seed periode/prodi/biaya: semua diisi pihak kampus.
-- =====================================================================

create table public.pmb_periods (
  id            uuid primary key default gen_random_uuid(),
  academic_year text not null,
  name          text not null,
  description   text,
  requirements  text,
  schedule      text,
  start_date    date not null,
  end_date      date not null,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.study_programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) <= 150),
  level       text,
  description text,
  is_active   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.applicants (
  id              uuid primary key default gen_random_uuid(),
  registration_no text not null unique,
  tracking_hash   text not null,                      -- sha256 dari kode pelacakan
  user_id         uuid references auth.users(id) on delete set null,
  period_id       uuid not null references public.pmb_periods(id) on delete restrict,
  program_id      uuid not null references public.study_programs(id) on delete restrict,
  full_name       text not null check (char_length(full_name) between 2 and 150),
  birth_place     text check (char_length(birth_place) <= 100),
  birth_date      date,
  gender          text check (gender in ('male','female')),
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text check (char_length(phone) <= 30),
  address         text check (char_length(address) <= 500),
  previous_school text check (char_length(previous_school) <= 150),
  graduation_year int check (graduation_year between 1980 and 2100),
  guardian_name   text check (char_length(guardian_name) <= 150),
  guardian_phone  text check (char_length(guardian_phone) <= 30),
  status          text not null default 'submitted' check (status in
    ('submitted','verifying','need_revision','verified','accepted','rejected','withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Sengaja tidak mengumpulkan NIK/KK/data sensitif lain. Tambahkan hanya bila kampus mewajibkan.
create unique index applicants_user_period_uq on public.applicants(user_id, period_id) where user_id is not null;
create index applicants_status_idx on public.applicants(status, created_at desc);
create index applicants_period_idx on public.applicants(period_id, program_id);

create table public.applicant_documents (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references public.applicants(id) on delete cascade,
  doc_type      text not null check (char_length(doc_type) <= 60),
  file_path     text not null,                        -- bucket pmb-documents: <uid>/<applicant_id>/<file>
  original_name text check (char_length(original_name) <= 200),
  mime_type     text,
  size_bytes    int check (size_bytes is null or size_bytes <= 5242880),
  created_at    timestamptz not null default now()
);
create index applicant_documents_idx on public.applicant_documents(applicant_id);

create table public.applicant_status_histories (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references public.applicants(id) on delete cascade,
  status_from   text,
  status_to     text not null,
  note_public   text check (char_length(note_public) <= 1000),   -- tampil ke pendaftar
  note_internal text check (char_length(note_internal) <= 2000), -- hanya petugas
  changed_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index applicant_hist_idx on public.applicant_status_histories(applicant_id, created_at);

-- Riwayat status otomatis tiap kali status berubah
create function public.log_applicant_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.applicant_status_histories(applicant_id, status_from, status_to, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger log_applicant_status after update of status on public.applicants
  for each row execute function public.log_applicant_status();

-- Pendaftar tidak boleh mengubah status / nomor / periode sendiri
create function public.guard_applicant_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_pmb_staff() then return new; end if;
  if new.status is distinct from old.status
     or new.registration_no is distinct from old.registration_no
     or new.tracking_hash   is distinct from old.tracking_hash
     or new.user_id         is distinct from old.user_id
     or new.period_id       is distinct from old.period_id then
    raise exception 'applicant_fields_locked' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger guard_applicant_update before update on public.applicants
  for each row execute function public.guard_applicant_update();
