-- =====================================================================
-- 0008_triggers_grants.sql  |  updated_at, audit trigger, pengetatan GRANT
-- =====================================================================

-- updated_at otomatis pada semua tabel yang punya kolomnya
do $$
declare r record;
begin
  for r in
    select c.table_name from information_schema.columns c
    join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
    where c.table_schema = 'public' and c.column_name = 'updated_at'
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', r.table_name);
  end loop;
end $$;

-- Audit: semua operasi pada tabel penting
do $$
declare t text;
begin
  foreach t in array array['news','events','programs','officers','departments','galleries',
    'community_programs','public_reports','site_settings','user_roles','aspirations',
    'aspiration_updates','partnership_requests','sponsors','donations','donation_reports',
    'pmb_periods','study_programs','applicants']
  loop
    execute format('create trigger audit_row after insert or update or delete on public.%I
                    for each row execute function public.audit_row()', t);
  end loop;
  -- Forum: hanya perubahan & penghapusan (menghindari log berlebihan)
  foreach t in array array['forum_topics','forum_comments']
  loop
    execute format('create trigger audit_row after update or delete on public.%I
                    for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- Pengetatan hak (defense in depth di atas RLS)
revoke all on public.private_config, public.rate_limits from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

revoke select on
  public.applicants, public.applicant_documents, public.applicant_status_histories,
  public.aspirations, public.aspiration_updates,
  public.partnership_requests, public.partnership_updates,
  public.contact_messages, public.donations, public.audit_logs,
  public.user_roles, public.profiles, public.notifications,
  public.forum_likes, public.forum_reports
from anon;

-- Tabel baru di masa depan tidak otomatis bisa ditulis anon
alter default privileges in schema public revoke insert, update, delete on tables from anon;
