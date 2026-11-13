-- =====================================================================
-- 0005_rls.sql  |  Row Level Security: seluruh tabel + view publik
-- Prinsip: default TERTUTUP. Setiap akses dibuka secara eksplisit.
-- =====================================================================

-- 1) Aktifkan RLS pada SEMUA tabel di schema public
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;
-- private_config & rate_limits: RLS aktif TANPA policy = tertutup total via API.

-- 2) Pola umum staf: SELECT/INSERT/UPDATE/DELETE eksplisit per tabel
do $$
declare t record;
begin
  for t in select * from (values
    ('departments',        'public.is_admin()'),
    ('positions',          'public.is_admin()'),
    ('officers',           'public.is_admin()'),
    ('site_settings',      'public.is_admin()'),
    ('news_categories',    'public.is_editor()'),
    ('news',               'public.is_editor()'),
    ('events',             'public.is_editor()'),
    ('programs',           'public.is_editor()'),
    ('galleries',          'public.is_editor()'),
    ('gallery_items',      'public.is_editor()'),
    ('community_programs', 'public.is_editor()'),
    ('public_reports',     'public.is_editor()'),
    ('forum_categories',   'public.is_moderator()'),
    ('sponsors',           'public.is_admin()'),
    ('donations',          'public.is_admin()'),
    ('donation_reports',   'public.is_admin()'),
    ('pmb_periods',        'public.is_pmb_manager()'),
    ('study_programs',     'public.is_pmb_manager()')
  ) as v(tbl, pred) loop
    execute format('create policy %I on public.%I for select to authenticated using (%s)',
                   t.tbl||'_staff_select', t.tbl, t.pred);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
                   t.tbl||'_staff_insert', t.tbl, t.pred);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
                   t.tbl||'_staff_update', t.tbl, t.pred, t.pred);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)',
                   t.tbl||'_staff_delete', t.tbl, t.pred);
  end loop;
end $$;

-- 3) Pembacaan publik (anon + authenticated) hanya untuk konten yang dipublikasikan
create policy departments_public_select on public.departments for select to anon, authenticated using (true);
create policy positions_public_select   on public.positions   for select to anon, authenticated using (true);
create policy officers_public_select    on public.officers    for select to anon, authenticated using (is_published);
create policy site_settings_public_select on public.site_settings for select to anon, authenticated using (is_public);
create policy news_categories_public_select on public.news_categories for select to anon, authenticated using (true);
create policy news_public_select on public.news for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy events_public_select    on public.events    for select to anon, authenticated using (is_published);
create policy programs_public_select  on public.programs  for select to anon, authenticated using (is_published);
create policy galleries_public_select on public.galleries for select to anon, authenticated using (is_published);
create policy gallery_items_public_select on public.gallery_items for select to anon, authenticated
  using (exists (select 1 from public.galleries g where g.id = gallery_id and g.is_published));
create policy community_programs_public_select on public.community_programs for select to anon, authenticated using (is_published);
create policy public_reports_public_select on public.public_reports for select to anon, authenticated using (is_published);
create policy forum_categories_public_select on public.forum_categories for select to anon, authenticated using (is_active);
create policy sponsors_public_select on public.sponsors for select to anon, authenticated using (is_published);
create policy donation_reports_public_select on public.donation_reports for select to anon, authenticated
  using (is_published and approved_by is not null);
create policy pmb_periods_public_select on public.pmb_periods for select to anon, authenticated
  using (is_active and public.pmb_enabled());
create policy study_programs_public_select on public.study_programs for select to anon, authenticated
  using (is_active and public.pmb_enabled());

-- 4) profiles
create policy profiles_select_own_or_admin on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- INSERT hanya lewat trigger handle_new_user; DELETE lewat cascade auth.users.

-- 5) user_roles: hanya super_admin yang dapat memberi/mencabut role
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_roles_insert on public.user_roles for insert to authenticated with check (public.is_super_admin());
create policy user_roles_update on public.user_roles for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy user_roles_delete on public.user_roles for delete to authenticated using (public.is_super_admin());

-- 6) Aspirasi (INSERT hanya lewat RPC submit_aspiration)
create policy aspirations_select on public.aspirations for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy aspirations_update on public.aspirations for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy aspirations_delete on public.aspirations for delete to authenticated using (public.is_admin());

-- Catatan internal & riwayat: HANYA staf. Pengunjung membaca riwayat non-internal via RPC track_aspiration.
create policy aspiration_updates_select on public.aspiration_updates for select to authenticated using (public.is_moderator());
create policy aspiration_updates_insert on public.aspiration_updates for insert to authenticated
  with check (public.is_moderator() and author_id = auth.uid());
create policy aspiration_updates_update on public.aspiration_updates for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy aspiration_updates_delete on public.aspiration_updates for delete to authenticated using (public.is_admin());

-- 7) Forum
create policy forum_topics_select on public.forum_topics for select to anon, authenticated
  using (status <> 'hidden' or public.is_moderator() or author_id = auth.uid());
create policy forum_topics_insert on public.forum_topics for insert to authenticated
  with check (author_id = auth.uid() and not public.is_banned()
              and status = 'open' and not is_pinned and not is_evaluation_material
              and exists (select 1 from public.forum_categories c where c.id = category_id and c.is_active));
create policy forum_topics_update_own on public.forum_topics for update to authenticated
  using (author_id = auth.uid() and status = 'open' and not public.is_banned())
  with check (author_id = auth.uid());
create policy forum_topics_update_mod on public.forum_topics for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy forum_topics_delete on public.forum_topics for delete to authenticated using (public.is_moderator());

create policy forum_comments_select on public.forum_comments for select to anon, authenticated
  using ((not is_hidden and exists (select 1 from public.forum_topics t where t.id = topic_id))
         or public.is_moderator() or author_id = auth.uid());
create policy forum_comments_insert on public.forum_comments for insert to authenticated
  with check (author_id = auth.uid() and not public.is_banned() and not is_hidden
              and exists (select 1 from public.forum_topics t where t.id = topic_id and t.status = 'open'));
create policy forum_comments_update_own on public.forum_comments for update to authenticated
  using (author_id = auth.uid() and not public.is_banned()) with check (author_id = auth.uid());
create policy forum_comments_update_mod on public.forum_comments for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy forum_comments_delete on public.forum_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy forum_likes_select on public.forum_likes for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy forum_likes_insert on public.forum_likes for insert to authenticated
  with check (user_id = auth.uid() and not public.is_banned());
create policy forum_likes_delete on public.forum_likes for delete to authenticated using (user_id = auth.uid());

create policy forum_reports_insert on public.forum_reports for insert to authenticated
  with check (reporter_id = auth.uid() and not public.is_banned());
create policy forum_reports_select on public.forum_reports for select to authenticated using (public.is_moderator());
create policy forum_reports_update on public.forum_reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy forum_reports_delete on public.forum_reports for delete to authenticated using (public.is_moderator());

-- 8) Kemitraan (INSERT lewat RPC submit_partnership), pesan kontak (RPC submit_contact_message)
create policy partnership_select on public.partnership_requests for select to authenticated using (public.is_admin());
create policy partnership_update on public.partnership_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy partnership_delete on public.partnership_requests for delete to authenticated using (public.is_admin());

create policy partnership_updates_select on public.partnership_updates for select to authenticated using (public.is_admin());
create policy partnership_updates_insert on public.partnership_updates for insert to authenticated
  with check (public.is_admin() and author_id = auth.uid());
create policy partnership_updates_update on public.partnership_updates for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy partnership_updates_delete on public.partnership_updates for delete to authenticated using (public.is_admin());

create policy contact_select on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy contact_delete on public.contact_messages for delete to authenticated using (public.is_admin());

-- 9) Notifikasi
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_admin());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- 10) PMB: privat. Tidak ada policy publik pada tiga tabel di bawah.
create policy applicants_select on public.applicants for select to authenticated
  using (user_id = auth.uid() or public.is_pmb_staff());
create policy applicants_update_own on public.applicants for update to authenticated
  using (user_id = auth.uid() and status in ('submitted','need_revision'))
  with check (user_id = auth.uid());
create policy applicants_update_staff on public.applicants for update to authenticated
  using (public.is_pmb_staff()) with check (public.is_pmb_staff());
create policy applicants_delete on public.applicants for delete to authenticated using (public.is_pmb_staff());

create policy applicant_docs_select on public.applicant_documents for select to authenticated
  using (public.is_pmb_staff() or exists
         (select 1 from public.applicants a where a.id = applicant_id and a.user_id = auth.uid()));
create policy applicant_docs_insert on public.applicant_documents for insert to authenticated
  with check (exists (select 1 from public.applicants a
                      where a.id = applicant_id and a.user_id = auth.uid()
                        and a.status in ('submitted','need_revision')));
create policy applicant_docs_delete on public.applicant_documents for delete to authenticated
  using (public.is_pmb_staff() or exists
         (select 1 from public.applicants a where a.id = applicant_id and a.user_id = auth.uid()
                                              and a.status in ('submitted','need_revision')));

-- Riwayat memuat catatan internal -> hanya petugas. Pendaftar memakai RPC my_applicant_history.
create policy applicant_hist_select on public.applicant_status_histories for select to authenticated using (public.is_pmb_staff());
create policy applicant_hist_insert on public.applicant_status_histories for insert to authenticated
  with check (public.is_pmb_staff() and changed_by = auth.uid());

-- 11) Audit log: hanya admin yang boleh membaca; tidak ada policy tulis (diisi trigger)
create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- 12) View publik (hak pemilik view, kolom dibatasi)
create view public.public_aspirations as
  select id, category, title, content, status, public_response, created_at
  from public.aspirations where is_public;

create view public.public_donations as
  select id,
         case when display_publicly and donor_name is not null then donor_name else 'Anonim' end as donor_display,
         amount, purpose, program_id, donated_at
  from public.donations
  where is_published and status = 'verified'
    and coalesce((select value = 'true'::jsonb from public.site_settings where key = 'donation_enabled'), false);

create view public.forum_like_counts as
  select topic_id, comment_id, count(*)::int as likes
  from public.forum_likes group by topic_id, comment_id;

grant select on public.public_aspirations, public.public_donations, public.forum_like_counts
  to anon, authenticated;

-- Verifikasi: query ini harus mengembalikan 0 baris
-- select tablename from pg_tables where schemaname='public' and not rowsecurity;
