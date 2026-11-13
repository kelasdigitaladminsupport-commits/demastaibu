-- =====================================================================
-- 0002_content.sql  |  Berita, agenda, program, galeri, pengabdian,
--                      laporan, pesan kontak, notifikasi
-- =====================================================================

create table public.news_categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) <= 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.news (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 200),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id  uuid references public.news_categories(id) on delete set null,
  author_id    uuid references auth.users(id) on delete set null,
  author_name  text check (char_length(author_name) <= 120),
  cover_path   text,
  excerpt      text check (char_length(excerpt) <= 400),
  content      text not null default '',
  status       text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index news_pub_idx   on public.news(status, published_at desc);
create index news_cat_idx   on public.news(category_id);
create index news_title_trgm on public.news using gin (title extensions.gin_trgm_ops);

create function public.news_publish_guard() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger news_publish_guard before insert or update on public.news
  for each row execute function public.news_publish_guard();

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 200),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  event_date  timestamptz not null,
  end_date    timestamptz,
  location    text,
  description text,
  poster_path text,
  status      text not null default 'upcoming' check (status in ('upcoming','ongoing','done','cancelled')),
  is_published boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or end_date >= event_date)
);
create index events_date_idx on public.events(event_date desc);
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);

create table public.programs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 3 and 200),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  department_id uuid references public.departments(id) on delete set null,
  description   text,
  status        text not null default 'planned' check (status in ('planned','ongoing','done','cancelled')),
  start_date    date,
  end_date      date,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index programs_dept_idx on public.programs(department_id);

create table public.galleries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) <= 200),
  description text,
  event_id    uuid references public.events(id) on delete set null,
  cover_path  text,
  is_published boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index galleries_event_idx on public.galleries(event_id);

create table public.gallery_items (
  id         uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  image_path text not null,
  caption    text check (char_length(caption) <= 300),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index gallery_items_gallery_idx on public.gallery_items(gallery_id, sort_order);

create table public.community_programs (        -- pengabdian kepada masyarakat
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 3 and 200),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description   text,
  location      text,
  activity_date date,
  cover_path    text,
  status        text not null default 'planned' check (status in ('planned','ongoing','done','cancelled')),
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.public_reports (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) <= 200),
  report_type text not null default 'activity' check (report_type in ('activity','evaluation','financial','other')),
  period_label text,
  summary    text,
  file_path  text,                              -- bucket public-docs
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 120),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  subject    text not null check (char_length(subject) between 3 and 200),
  message    text not null check (char_length(message) between 5 and 4000),
  status     text not null default 'new' check (status in ('new','read','replied','archived')),
  created_at timestamptz not null default now()
);
create index contact_status_idx on public.contact_messages(status, created_at desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) <= 200),
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
