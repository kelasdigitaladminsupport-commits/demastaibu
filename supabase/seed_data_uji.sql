-- =====================================================================
-- seed_data_uji.sql | DATA CONTOH untuk menguji tampilan website.
-- Semua baris diberi tanda [UJI]. BERSIHKAN dengan supabase/cleanup_data_uji.sql sebelum publikasi.
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang (tidak membuat duplikat).
-- Tidak berisi nama orang nyata, kontak, rekening, biaya, atau jadwal resmi.
-- =====================================================================

insert into public.news_categories(name, slug) values ('Umum [UJI]', 'umum-uji')
on conflict (slug) do nothing;

insert into public.news(title, slug, category_id, author_name, excerpt, content, status, published_at)
select t.title, t.slug, c.id, 'Admin [UJI]', 'Ringkasan contoh untuk menguji tampilan.',
       E'Ini paragraf pertama berita contoh.\n\nIni paragraf kedua. Hapus data ini sebelum publikasi.', 'published', now() - (t.n || ' hours')::interval
from (values ('Berita contoh pertama [UJI]', 'berita-contoh-pertama-uji', 2), ('Berita contoh kedua [UJI]', 'berita-contoh-kedua-uji', 1)) as t(title, slug, n)
cross join public.news_categories c where c.slug = 'umum-uji'
on conflict (slug) do nothing;

insert into public.events(title, slug, event_date, location, description, status, is_published) values
  ('Agenda mendatang [UJI]', 'agenda-mendatang-uji', now() + interval '14 days', 'Lokasi contoh', 'Deskripsi agenda contoh.', 'upcoming', true),
  ('Agenda selesai [UJI]', 'agenda-selesai-uji', now() - interval '30 days', 'Lokasi contoh', 'Deskripsi agenda contoh.', 'done', true)
on conflict (slug) do nothing;

insert into public.departments(name, slug, description, sort_order) values ('Bidang Contoh [UJI]', 'bidang-contoh-uji', 'Deskripsi bidang contoh.', 99)
on conflict (slug) do nothing;

insert into public.programs(title, slug, department_id, description, status, start_date, is_published)
select 'Program contoh [UJI]', 'program-contoh-uji', d.id, 'Deskripsi program contoh.', 'planned', current_date, true
from public.departments d where d.slug = 'bidang-contoh-uji'
on conflict (slug) do nothing;

insert into public.community_programs(title, slug, description, location, activity_date, status, is_published)
values ('Pengabdian contoh [UJI]', 'pengabdian-contoh-uji', 'Deskripsi kegiatan contoh.', 'Lokasi contoh', current_date, 'planned', true)
on conflict (slug) do nothing;

insert into public.galleries(title, description, is_published)
select 'Galeri contoh [UJI]', 'Tambahkan foto lewat dasbor.', true
where not exists (select 1 from public.galleries where title = 'Galeri contoh [UJI]');

insert into public.forum_categories(name, slug, description) values ('Diskusi Umum [UJI]', 'diskusi-umum-uji', 'Kategori contoh.')
on conflict (slug) do nothing;

insert into public.officers(full_name, position_id, department_id, period, duty_description, is_published)
select 'Nama Contoh [UJI]', p.id, null, '2099/2100', 'Pengurus fiktif untuk uji tampilan.', true
from public.positions p where p.title = 'Ketua DEMA'
  and not exists (select 1 from public.officers where full_name = 'Nama Contoh [UJI]');
