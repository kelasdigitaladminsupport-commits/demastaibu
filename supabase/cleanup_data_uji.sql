-- =====================================================================
-- cleanup_data_uji.sql | Menghapus SEMUA data yang bertanda [UJI] (data contoh maupun data uji buatan Anda).
-- Jalankan di Supabase SQL Editor sebelum publikasi. Tidak menyentuh data tanpa tanda [UJI].
--
-- TIPS: saat menguji lewat dasbor, beri tanda [UJI] pada judul/nama data Anda agar ikut terhapus.
-- CATATAN: berkas di Storage (gambar/PDF/dokumen) TIDAK terhapus oleh SQL ini. Hapus manual lewat
--          Dashboard -> Storage, atau hapus lewat dasbor admin sebelum menghapus datanya.
-- =====================================================================
begin;

-- PMB: hapus pendaftar pada periode uji dulu (periode dilindungi relasi RESTRICT)
delete from public.applicants where period_id in (select id from public.pmb_periods where name like '%[UJI]%' or academic_year like '%[UJI]%');
delete from public.pmb_periods   where name like '%[UJI]%' or academic_year like '%[UJI]%';
delete from public.study_programs where name like '%[UJI]%';

-- Konten
delete from public.gallery_items where gallery_id in (select id from public.galleries where title like '%[UJI]%');
delete from public.galleries     where title like '%[UJI]%';
delete from public.news          where title like '%[UJI]%';
delete from public.news_categories where name like '%[UJI]%';
delete from public.events        where title like '%[UJI]%';
delete from public.programs      where title like '%[UJI]%';
delete from public.community_programs where title like '%[UJI]%';
delete from public.public_reports where title like '%[UJI]%';
delete from public.officers      where full_name like '%[UJI]%';

-- Forum (topik/komentar ikut terhapus lewat cascade)
delete from public.forum_topics     where title like '%[UJI]%' or category_id in (select id from public.forum_categories where name like '%[UJI]%');
delete from public.forum_categories where name like '%[UJI]%';

-- Aspirasi, kemitraan, kontak, donasi
delete from public.aspirations          where title like '%[UJI]%';
delete from public.sponsors             where name like '%[UJI]%';
delete from public.partnership_requests where org_name like '%[UJI]%';
delete from public.contact_messages     where subject like '%[UJI]%';
delete from public.donation_reports     where title like '%[UJI]%';
delete from public.donations            where purpose like '%[UJI]%' or donor_name like '%[UJI]%';

-- Bidang dipakai pengurus/program: hapus terakhir
delete from public.departments where name like '%[UJI]%';

commit;
-- Memeriksa sisa: select 'news', count(*) from public.news where title like '%[UJI]%';
