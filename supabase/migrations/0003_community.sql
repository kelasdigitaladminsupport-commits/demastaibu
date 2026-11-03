-- =====================================================================
-- 0003_community.sql  |  Aspirasi, forum, kemitraan, sponsor, donasi
-- =====================================================================

-- ---------------------------- ASPIRASI -------------------------------
create table public.aspirations (
  id           uuid primary key default gen_random_uuid(),
  ticket_code  text not null unique,
  user_id      uuid references auth.users(id) on delete set null,
  category     text not null check (category in
    ('kritik','saran','ide_program','evaluasi_kegiatan','keluhan','akademik','fasilitas','sosial','kolaborasi')),
  title        text not null check (char_length(title) between 3 and 150),
  content      text not null check (char_length(content) between 5 and 5000),
  is_anonymous boolean not null default true,
  submitter_name    text check (char_length(submitter_name) <= 120),
  submitter_contact text check (char_length(submitter_contact) <= 150),
  attachment_path   text,
  status       text not null default 'received' check (status in
    ('received','reviewed','need_info','discussed','in_progress','done','rejected')),
  status_reason   text,
  public_response text,
  is_public    boolean not null default false,   -- tampil di halaman publik setelah ditinjau
  assigned_to  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (not is_anonymous or (user_id is null and submitter_name is null and submitter_contact is null)),
  check (status <> 'rejected' or status_reason is not null)
);
create index aspirations_status_idx on public.aspirations(status, created_at desc);
create index aspirations_user_idx   on public.aspirations(user_id);

create table public.aspiration_updates (          -- riwayat tindak lanjut + catatan internal
  id            uuid primary key default gen_random_uuid(),
  aspiration_id uuid not null references public.aspirations(id) on delete cascade,
  author_id     uuid references auth.users(id) on delete set null,
  note          text not null check (char_length(note) <= 3000),
  status_to     text check (status_to in
    ('received','reviewed','need_info','discussed','in_progress','done','rejected')),
  is_internal   boolean not null default true,    -- default AMAN: internal
  created_at    timestamptz not null default now()
);
create index aspiration_updates_idx on public.aspiration_updates(aspiration_id, created_at);

-- ------------------------------ FORUM --------------------------------
create table public.forum_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) <= 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.forum_topics (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories(id) on delete restrict,
  author_id   uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 5 and 200),
  content     text not null check (char_length(content) between 5 and 8000),
  status      text not null default 'open' check (status in ('open','closed','hidden')),
  is_pinned   boolean not null default false,
  is_evaluation_material boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index forum_topics_cat_idx on public.forum_topics(category_id, created_at desc);
create index forum_topics_author_idx on public.forum_topics(author_id);
create index forum_topics_title_trgm on public.forum_topics using gin (title extensions.gin_trgm_ops);

create table public.forum_comments (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.forum_topics(id) on delete cascade,
  parent_id  uuid references public.forum_comments(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 4000),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forum_comments_topic_idx on public.forum_comments(topic_id, created_at);

create table public.forum_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic_id   uuid references public.forum_topics(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(topic_id, comment_id) = 1)
);
create unique index forum_likes_topic_uq   on public.forum_likes(user_id, topic_id)   where topic_id is not null;
create unique index forum_likes_comment_uq on public.forum_likes(user_id, comment_id) where comment_id is not null;

create table public.forum_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  topic_id    uuid references public.forum_topics(id) on delete cascade,
  comment_id  uuid references public.forum_comments(id) on delete cascade,
  reason      text not null check (char_length(reason) between 3 and 1000),
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  handled_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (num_nonnulls(topic_id, comment_id) = 1)
);
create index forum_reports_status_idx on public.forum_reports(status, created_at desc);

-- Anti-spam di level database + penjaga kolom moderasi
create function public.guard_forum_topic() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_moderator() then return new; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.forum_topics
         where author_id = new.author_id and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'forum_rate_limit' using hint = 'Maksimal 5 topik per jam.';
    end if;
  else
    if new.status is distinct from old.status
       or new.is_pinned is distinct from old.is_pinned
       or new.is_evaluation_material is distinct from old.is_evaluation_material
       or new.author_id is distinct from old.author_id
       or new.category_id is distinct from old.category_id then
      raise exception 'moderation_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_forum_topic before insert or update on public.forum_topics
  for each row execute function public.guard_forum_topic();

create function public.guard_forum_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_moderator() then return new; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.forum_comments
         where author_id = new.author_id and created_at > now() - interval '1 hour') >= 20 then
      raise exception 'forum_rate_limit' using hint = 'Maksimal 20 komentar per jam.';
    end if;
  else
    if new.is_hidden is distinct from old.is_hidden
       or new.author_id is distinct from old.author_id
       or new.topic_id is distinct from old.topic_id then
      raise exception 'moderation_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_forum_comment before insert or update on public.forum_comments
  for each row execute function public.guard_forum_comment();

-- ------------------- KEMITRAAN, SPONSOR, DONASI ----------------------
create table public.partnership_requests (
  id            uuid primary key default gen_random_uuid(),
  reference_no  text not null unique,
  org_name      text not null check (char_length(org_name) between 2 and 200),
  contact_person text not null check (char_length(contact_person) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text check (char_length(phone) <= 30),
  partner_type  text not null check (partner_type in
    ('sponsor','donor','education','umkm','institution','community','alumni','public')),
  cooperation_type text not null check (char_length(cooperation_type) <= 150),
  supported_program text check (char_length(supported_program) <= 200),
  support_form  text check (char_length(support_form) <= 200),
  support_value numeric(14,2) check (support_value is null or support_value >= 0),
  message       text not null check (char_length(message) between 5 and 4000),
  proposal_path text,
  status        text not null default 'received' check (status in
    ('received','reviewed','discussing','agreed','declined','completed')),
  publish_consent boolean not null default false,   -- izin publikasi di halaman transparansi
  assigned_to   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index partnership_status_idx on public.partnership_requests(status, created_at desc);
create index partnership_email_idx  on public.partnership_requests(lower(email));

create table public.partnership_updates (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.partnership_requests(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  note       text not null check (char_length(note) <= 3000),
  status_to  text check (status_to in ('received','reviewed','discussing','agreed','declined','completed')),
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);
create index partnership_updates_idx on public.partnership_updates(request_id, created_at);

create table public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) <= 200),
  logo_path   text,
  description text,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  request_id  uuid references public.partnership_requests(id) on delete set null,
  is_published boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sponsor hanya boleh dipublikasikan bila mitra asal permohonan menyetujui
create function public.sponsor_requires_consent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_published and new.request_id is not null and not exists
     (select 1 from public.partnership_requests where id = new.request_id and publish_consent) then
    raise exception 'partner_consent_required' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger sponsor_requires_consent before insert or update on public.sponsors
  for each row execute function public.sponsor_requires_consent();

-- Pencatatan donasi MANUAL oleh pengelola. Tidak ada pembayaran otomatis / rekening.
create table public.donations (
  id          uuid primary key default gen_random_uuid(),
  donor_name  text check (char_length(donor_name) <= 150),
  display_publicly boolean not null default false,   -- izin menampilkan nama
  amount      numeric(14,2) not null check (amount > 0),
  purpose     text check (char_length(purpose) <= 300),
  program_id  uuid references public.programs(id) on delete set null,
  donated_at  date not null default current_date,
  status      text not null default 'pending' check (status in ('pending','verified','rejected')),
  is_published boolean not null default false,
  internal_note text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index donations_status_idx on public.donations(status, donated_at desc);

create table public.donation_reports (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) <= 200),
  period_label text,
  summary     text,
  total_in    numeric(14,2) check (total_in is null or total_in >= 0),
  total_out   numeric(14,2) check (total_out is null or total_out >= 0),
  file_path   text,                                   -- bucket public-docs
  is_published boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (not is_published or approved_by is not null)  -- hanya laporan yang disetujui
);
