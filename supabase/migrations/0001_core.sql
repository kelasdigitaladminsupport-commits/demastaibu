-- =====================================================================
-- 0001_core.sql  |  Fondasi: ekstensi, role, profil, struktur organisasi,
--                   pengaturan situs, rate limit, kode unik, audit log
-- Jalankan berurutan 0001 -> 0008 (SQL Editor atau `supabase db push`)
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- ---------- Konfigurasi privat (tidak bisa diakses via API) ----------
create table public.private_config (
  key   text primary key,
  value text not null
);
insert into public.private_config(key, value)
values ('hash_salt', encode(extensions.gen_random_bytes(16), 'hex'));

-- ---------- Role ----------
create type public.app_role as enum
  ('super_admin','admin','editor','moderator','pmb_officer','member');

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text check (char_length(full_name) <= 120),
  nim         text check (char_length(nim) <= 30),
  avatar_path text,
  bio         text check (char_length(bio) <= 500),
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- user_roles (satu-satunya sumber kebenaran role) ----------
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles(user_id);

-- ---------- Fungsi pengecekan role (selalu memakai auth.uid()) ----------
-- Tanpa parameter user_id agar orang lain tidak bisa menguji role pengguna lain.
create function public.has_any_role(_roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any(_roles)
  );
$$;

create function public.has_role(_role public.app_role) returns boolean
language sql stable as $$ select public.has_any_role(array[_role]); $$;

create function public.is_super_admin() returns boolean language sql stable as
$$ select public.has_any_role(array['super_admin']::public.app_role[]); $$;
create function public.is_admin() returns boolean language sql stable as
$$ select public.has_any_role(array['super_admin','admin']::public.app_role[]); $$;
create function public.is_editor() returns boolean language sql stable as
$$ select public.has_any_role(array['super_admin','admin','editor']::public.app_role[]); $$;
create function public.is_moderator() returns boolean language sql stable as
$$ select public.has_any_role(array['super_admin','admin','moderator']::public.app_role[]); $$;
-- Data pendaftar: hanya petugas PMB dan super admin
create function public.is_pmb_staff() returns boolean language sql stable as
$$ select public.has_any_role(array['super_admin','pmb_officer']::public.app_role[]); $$;
-- Mengelola periode/prodi PMB (tanpa akses data pendaftar)
create function public.is_pmb_manager() returns boolean language sql stable as
$$ select public.has_any_role(array['super_admin','admin','pmb_officer']::public.app_role[]); $$;

create function public.is_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_banned from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Pembuatan profil otomatis saat pendaftaran ----------
-- Role SELALU 'member'. Tidak pernah membaca role dari metadata yang bisa diedit klien.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email,
          nullif(left(coalesce(new.raw_user_meta_data->>'full_name',''), 120), ''));
  insert into public.user_roles(user_id, role) values (new.id, 'member');
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Non-admin tidak boleh mengubah is_banned / email / id pada profil sendiri
create function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_banned := old.is_banned;
    new.email     := old.email;
    new.id        := old.id;
  end if;
  return new;
end $$;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- View publik terbatas (tanpa email/NIM). Sengaja berjalan dengan hak pemilik view.
create view public.public_profiles as
  select id, full_name, avatar_path from public.profiles where not is_banned;

-- ---------- Struktur organisasi ----------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) <= 120),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.positions (
  id         uuid primary key default gen_random_uuid(),
  title      text not null unique check (char_length(title) <= 120),
  level      int  not null default 10,   -- 1 = paling atas, untuk hierarki
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table public.officers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  full_name     text not null check (char_length(full_name) <= 120),
  position_id   uuid not null references public.positions(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  period        text not null,           -- contoh: '2025/2026'
  photo_path    text,
  duty_description text,
  is_coordinator boolean not null default false,
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Sengaja TIDAK ada kolom telepon/email/alamat pribadi.
create index officers_dept_idx on public.officers(department_id);
create index officers_pos_idx  on public.officers(position_id);

-- ---------- site_settings (profil, visi, misi, saklar fitur) ----------
create table public.site_settings (
  key        text primary key,
  value      jsonb not null default 'null'::jsonb,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.positions(title, level, sort_order) values
  ('Ketua DEMA', 1, 1), ('Wakil Ketua', 2, 2), ('Sekretaris', 3, 3),
  ('Wakil Sekretaris', 4, 4), ('Koordinator Bidang', 5, 5), ('Anggota Bidang', 6, 6);

-- Saklar fitur nonaktif secara default. Konten resmi sengaja dikosongkan.
insert into public.site_settings(key, value, is_public) values
  ('site_name',          '"DEMA STAI Bahriyatul Ulum KH. Zainul Arifin Pandan"', true),
  ('about',              '""',    true),
  ('vision',             '""',    true),
  ('mission',            '[]',    true),
  ('contact',            '{}',    true),
  ('social_links',       '{}',    true),
  ('pmb_enabled',        'false', true),
  ('donation_enabled',   'false', true),
  ('forum_enabled',      'true',  true),
  ('aspiration_enabled', 'true',  true);

create function public.pmb_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from public.site_settings where key = 'pmb_enabled'), false);
$$;

-- ---------- Rate limit & kode unik ----------
create table public.rate_limits (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  key_hash   text not null,
  created_at timestamptz not null default now()
);
create index rate_limits_lookup_idx on public.rate_limits(bucket, key_hash, created_at);

-- Hash IP klien (dengan salt). Header cf-connecting-ip diprioritaskan karena
-- tidak dapat dipalsukan klien; VERIFIKASI di proyek Anda (lihat README).
create function public.client_key() returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare h json; ip text; salt text;
begin
  begin h := current_setting('request.headers', true)::json;
  exception when others then h := null; end;
  ip := nullif(btrim(coalesce(h->>'cf-connecting-ip', h->>'x-real-ip',
                              split_part(coalesce(h->>'x-forwarded-for',''), ',', 1), '')), '');
  select value into salt from public.private_config where key = 'hash_salt';
  return encode(digest(coalesce(ip,'unknown') || ':' || coalesce(salt,''), 'sha256'), 'hex');
end $$;

create function public.check_rate_limit(_bucket text, _max int, _window interval) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text := coalesce(auth.uid()::text, public.client_key()); n int;
begin
  if random() < 0.02 then
    delete from public.rate_limits where created_at < now() - interval '2 days';
  end if;
  select count(*) into n from public.rate_limits
   where bucket = _bucket and key_hash = k and created_at > now() - _window;
  if n >= _max then
    raise exception 'rate_limit_exceeded' using hint = 'Terlalu banyak percobaan. Coba lagi nanti.';
  end if;
  insert into public.rate_limits(bucket, key_hash) values (_bucket, k);
end $$;

-- Kode acak tanpa karakter ambigu (tanpa I, O, 0, 1). 32 karakter -> bias nol.
create function public.gen_code(_prefix text, _len int) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := gen_random_bytes(_len); out text := ''; i int;
begin
  for i in 0 .. _len - 1 loop
    out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return _prefix || '-' || out;
end $$;

-- ---------- Audit log ----------
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  table_name text not null,
  record_id  text,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_table_idx   on public.audit_logs(table_name, created_at desc);

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; src jsonb;
begin
  if tg_op = 'DELETE' then o := to_jsonb(old); src := o;
  elsif tg_op = 'INSERT' then n := to_jsonb(new); src := n;
  else o := to_jsonb(old); n := to_jsonb(new); src := n; end if;

  -- Tabel berisi data pribadi: catat status saja, bukan isinya.
  if tg_table_name in ('applicants','aspirations','partnership_requests') then
    if o is not null then o := jsonb_build_object('status', o->>'status'); end if;
    if n is not null then n := jsonb_build_object('status', n->>'status'); end if;
  end if;

  insert into public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, coalesce(src->>'id', src->>'key'), o, n);
  return coalesce(new, old);
end $$;
