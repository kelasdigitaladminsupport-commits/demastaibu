-- =====================================================================
-- 0011_donation_summary.sql
-- Ringkasan total donasi untuk halaman transparansi publik. Dihitung dari view
-- public_donations (hanya donasi terverifikasi + dipublikasikan, dan hanya saat
-- saklar donation_enabled aktif), sehingga tidak membuka data donasi mentah.
-- =====================================================================
create view public.public_donation_summary as
  select coalesce(sum(amount), 0)::numeric(14,2) as total, count(*)::int as donation_count
  from public.public_donations;

grant select on public.public_donation_summary to anon, authenticated;
