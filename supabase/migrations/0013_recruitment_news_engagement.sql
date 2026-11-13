-- =====================================================================
-- 0013_recruitment_news_engagement.sql
--   A) Pendaftaran kepengurusan DEMA (periode rekrutmen + pendaftar)
--   B) Komentar & like pada berita
-- Jalankan SETELAH 0001 -> 0012. Aman dijalankan sekali saja.
-- Tidak ada seed: syarat resmi diisi pengelola dari Pedoman Kemahasiswaan.
-- =====================================================================

-- =====================================================================
-- A) REKRUTMEN KEPENGURUSAN
-- =====================================================================
create table public.recruitment_periods (
  id             uuid primary key default gen_random_uuid(),
  academic_year  text not null check (char_length(academic_year) <= 30),
  name           text not null check (char_length(name) <= 150),
  description    text,
  requirements   text,            -- SATU syarat per baris (disalin dari Pedoman Kemahasiswaan)
  schedule       text,
  guideline_title text check (char_length(guideline_title) <= 150),
  guideline_path text,            -- PDF pedoman di bucket public-docs
  start_date     date not null,
  end_date       date not null,
  is_active      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.recruitment_applications (
  id              uuid primary key default gen_random_uuid(),
  registration_no text not null unique,
  user_id         uuid not null references auth.users(id) on delete cascade,
  period_id       uuid not null references public.recruitment_periods(id) on delete restrict,
  first_department_id  uuid,
  second_department_id uuid,
  full_name       text not null check (char_length(full_name) between 2 and 150),
  nim             text not null check (char_length(nim) between 3 and 30),
  study_program   text check (char_length(study_program) <= 150),
  semester        int  check (semester between 1 and 14),
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text not null check (char_length(phone) <= 30),
  motivation      text not null check (char_length(motivation) between 20 and 3000),
  experience      text check (char_length(experience) <= 3000),
  requirements_confirmed boolean not null default false check (requirements_confirmed),
  status          text not null default 'submitted' check (status in
    ('submitted','reviewing','interview','accepted','rejected','withdrawn')),
  note_public     text check (char_length(note_public) <= 1000),   -- terlihat pendaftar
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint recruitment_applications_first_department_id_fkey
    foreign key (first_department_id) references public.departments(id) on delete set null,
  constraint recruitment_applications_second_department_id_fkey
    foreign key (second_department_id) references public.departments(id) on delete set null,
  unique (user_id, period_id)
);
create index recruitment_apps_status_idx on public.recruitment_applications(status, created_at desc);
create index recruitment_apps_period_idx on public.recruitment_applications(period_id);

-- Pendaftaran HANYA lewat RPC (validasi periode, bidang, rate limit, syarat dikonfirmasi).
create function public.submit_recruitment(
  p_period_id uuid, p_first_department_id uuid, p_second_department_id uuid,
  p_full_name text, p_nim text, p_study_program text, p_semester int,
  p_email text, p_phone text, p_motivation text, p_experience text,
  p_requirements_confirmed boolean
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_reg text; v_id uuid; v_try int := 0;
begin
  if v_uid is null then raise exception 'login_required' using errcode = '28000'; end if;
  if public.is_banned() then raise exception 'account_banned' using errcode = '42501'; end if;
  perform public.check_rate_limit('submit_recruitment', 5, interval '1 day');

  if not coalesce(p_requirements_confirmed, false) then raise exception 'requirements_not_confirmed'; end if;
  if not exists (select 1 from public.recruitment_periods
                 where id = p_period_id and is_active and current_date between start_date and end_date) then
    raise exception 'recruitment_closed';
  end if;
  if p_first_department_id is null
     or not exists (select 1 from public.departments where id = p_first_department_id) then
    raise exception 'invalid_department';
  end if;
  if p_second_department_id is not null then
    if p_second_department_id = p_first_department_id
       or not exists (select 1 from public.departments where id = p_second_department_id) then
      raise exception 'invalid_department';
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
        email, phone, motivation, experience, requirements_confirmed)
      values (v_reg, v_uid, p_period_id, p_first_department_id, p_second_department_id,
        btrim(p_full_name), btrim(p_nim), nullif(btrim(p_study_program), ''), p_semester,
        btrim(p_email), btrim(p_phone), btrim(p_motivation), nullif(btrim(p_experience), ''), true)
      returning id into v_id;
      exit;
    exception when unique_violation then
      if exists (select 1 from public.recruitment_applications where user_id = v_uid and period_id = p_period_id) then
        raise exception 'already_registered';
      end if;
      v_try := v_try + 1; if v_try > 5 then raise; end if;
    end;
  end loop;

  return jsonb_build_object('id', v_id, 'registration_no', v_reg);
end $$;

-- Pendaftar dapat mengundurkan diri selama belum diputuskan
create function public.withdraw_recruitment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login_required' using errcode = '28000'; end if;
  update public.recruitment_applications set status = 'withdrawn'
   where id = p_id and user_id = auth.uid() and status in ('submitted','reviewing');
  if not found then raise exception 'cannot_withdraw'; end if;
end $$;

-- Ekspor data pendaftar wajib tercatat di audit log
create function public.log_recruitment_export(p_count int, p_filter text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.audit_logs(actor_id, action, table_name, record_id, new_data)
  values (auth.uid(), 'EXPORT', 'recruitment_applications', null,
          jsonb_build_object('rows', p_count, 'filter', left(coalesce(p_filter, ''), 300)));
end $$;

-- =====================================================================
-- B) KOMENTAR & LIKE BERITA
-- =====================================================================
create table public.news_comments (
  id         uuid primary key default gen_random_uuid(),
  news_id    uuid not null references public.news(id) on delete cascade,
  parent_id  uuid references public.news_comments(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_comments_news_idx on public.news_comments(news_id, created_at);

create table public.news_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  news_id    uuid references public.news(id) on delete cascade,
  comment_id uuid references public.news_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(news_id, comment_id) = 1)
);
create unique index news_likes_news_uq    on public.news_likes(user_id, news_id)    where news_id is not null;
create unique index news_likes_comment_uq on public.news_likes(user_id, comment_id) where comment_id is not null;
create index news_likes_news_idx on public.news_likes(news_id) where news_id is not null;

-- Anti-spam + penjaga kolom moderasi + balasan hanya satu tingkat
create function public.guard_news_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null and not exists (
         select 1 from public.news_comments p
          where p.id = new.parent_id and p.news_id = new.news_id and p.parent_id is null) then
      raise exception 'invalid_parent' using errcode = '23514';
    end if;
    if auth.uid() is not null and not public.is_moderator()
       and (select count(*) from public.news_comments
             where author_id = new.author_id and created_at > now() - interval '1 hour') >= 20 then
      raise exception 'news_rate_limit' using hint = 'Maksimal 20 komentar per jam.';
    end if;
  else
    if auth.uid() is not null and not public.is_moderator()
       and (new.is_hidden is distinct from old.is_hidden
            or new.author_id is distinct from old.author_id
            or new.news_id   is distinct from old.news_id
            or new.parent_id is distinct from old.parent_id) then
      raise exception 'moderation_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_news_comment before insert or update on public.news_comments
  for each row execute function public.guard_news_comment();

-- Jumlah like (tanpa membuka siapa yang menyukai)
create view public.news_like_counts as
  select news_id, comment_id, count(*)::int as likes
  from public.news_likes group by news_id, comment_id;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.recruitment_periods      enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.news_comments            enable row level security;
alter table public.news_likes               enable row level security;

-- Periode: admin kelola, publik membaca yang aktif
create policy recruitment_periods_staff_select on public.recruitment_periods for select to authenticated using (public.is_admin());
create policy recruitment_periods_staff_insert on public.recruitment_periods for insert to authenticated with check (public.is_admin());
create policy recruitment_periods_staff_update on public.recruitment_periods for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recruitment_periods_staff_delete on public.recruitment_periods for delete to authenticated using (public.is_admin());
create policy recruitment_periods_public_select on public.recruitment_periods for select to anon, authenticated using (is_active);

-- Pendaftar: pemilik atau admin yang membaca; INSERT hanya lewat RPC; hanya admin yang mengubah status
create policy recruitment_apps_select on public.recruitment_applications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy recruitment_apps_update on public.recruitment_applications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy recruitment_apps_delete on public.recruitment_applications for delete to authenticated
  using (public.is_admin());

-- Komentar berita
create policy news_comments_select on public.news_comments for select to anon, authenticated
  using ((not is_hidden and exists (select 1 from public.news n where n.id = news_id))
         or public.is_moderator() or author_id = auth.uid());
create policy news_comments_insert on public.news_comments for insert to authenticated
  with check (author_id = auth.uid() and not public.is_banned() and not is_hidden
              and exists (select 1 from public.news n
                           where n.id = news_id and n.status = 'published' and n.published_at <= now()));
create policy news_comments_update_own on public.news_comments for update to authenticated
  using (author_id = auth.uid() and not public.is_banned()) with check (author_id = auth.uid());
create policy news_comments_update_mod on public.news_comments for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy news_comments_delete on public.news_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- Like berita / komentar
create policy news_likes_select on public.news_likes for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy news_likes_insert on public.news_likes for insert to authenticated
  with check (user_id = auth.uid() and not public.is_banned()
              and (news_id is null or exists (select 1 from public.news n
                    where n.id = news_id and n.status = 'published' and n.published_at <= now()))
              and (comment_id is null or exists (select 1 from public.news_comments c where c.id = comment_id)));
create policy news_likes_delete on public.news_likes for delete to authenticated using (user_id = auth.uid());

-- =====================================================================
-- Trigger updated_at & audit
-- =====================================================================
create trigger set_updated_at before update on public.recruitment_periods
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recruitment_applications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.news_comments
  for each row execute function public.set_updated_at();

-- audit_row: data pribadi pendaftar rekrutmen hanya dicatat statusnya
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; src jsonb;
begin
  if tg_op = 'DELETE' then o := to_jsonb(old); src := o;
  elsif tg_op = 'INSERT' then n := to_jsonb(new); src := n;
  else o := to_jsonb(old); n := to_jsonb(new); src := n; end if;

  if tg_table_name in ('applicants','aspirations','partnership_requests','recruitment_applications') then
    if o is not null then o := jsonb_build_object('status', o->>'status'); end if;
    if n is not null then n := jsonb_build_object('status', n->>'status'); end if;
  end if;

  insert into public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, coalesce(src->>'id', src->>'key'), o, n);
  return coalesce(new, old);
end $$;

create trigger audit_row after insert or update or delete on public.recruitment_periods
  for each row execute function public.audit_row();
create trigger audit_row after insert or update or delete on public.recruitment_applications
  for each row execute function public.audit_row();
create trigger audit_row after update or delete on public.news_comments
  for each row execute function public.audit_row();

-- =====================================================================
-- GRANT (defense in depth di atas RLS)
-- =====================================================================
revoke insert, update, delete, truncate, references, trigger on
  public.recruitment_periods, public.recruitment_applications, public.news_comments, public.news_likes from anon;
revoke truncate, references, trigger on
  public.recruitment_periods, public.recruitment_applications, public.news_comments, public.news_likes from authenticated;
revoke select on public.recruitment_applications, public.news_likes from anon;
grant select on public.news_like_counts to anon, authenticated;

revoke execute on function
  public.submit_recruitment(uuid,uuid,uuid,text,text,text,int,text,text,text,text,boolean),
  public.withdraw_recruitment(uuid),
  public.log_recruitment_export(int,text),
  public.guard_news_comment()
from public, anon, authenticated;

grant execute on function
  public.submit_recruitment(uuid,uuid,uuid,text,text,text,int,text,text,text,text,boolean),
  public.withdraw_recruitment(uuid),
  public.log_recruitment_export(int,text)
to authenticated;
