# 7. Backup dan pemeliharaan

## Apa yang perlu dicadangkan
| Data | Lokasi | Pentingnya |
|---|---|---|
| Database (konten, akun, aspirasi, pendaftar, log) | Supabase PostgreSQL | **Utama** |
| Berkas unggahan (foto, PDF, lampiran, dokumen PMB) | Supabase Storage | Tinggi |
| Kode | GitHub | Sudah tercadangkan oleh git (pastikan `git push` rutin) |
| Pengaturan Auth/SMTP/domain | Dashboard Supabase & Netlify | Catat di dokumen aman (tanpa menyimpan password di tempat terbuka) |

## Fakta paket (periksa di akun Anda; informasi publik 2026)
- Paket **gratis** Supabase: **tidak ada backup harian otomatis** dan tidak ada point-in-time recovery; proyek **di-pause setelah ~7 hari tanpa aktivitas**; kuota sekitar 500 MB database dan 1 GB Storage per proyek. Backup harian tersedia pada paket berbayar (Pro). Verifikasi di supabase.com/pricing dan di Dashboard → Database → Backups.
- Artinya di paket gratis **Andalah yang bertanggung jawab atas cadangan**.

## Cadangan database (pilih salah satu)
1. **Paket Pro** → Dashboard → Database → Backups (otomatis harian).
2. **pg_dump** (butuh PostgreSQL client tools terpasang): ambil *connection string* di Dashboard → tombol **Connect** (gunakan koneksi langsung/session pooler), lalu:
   ```
   pg_dump "postgresql://postgres:PASSWORD@HOST:5432/postgres" --schema=public --no-owner -f backup-YYYY-MM-DD.sql
   ```
   Jangan menulis password di riwayat perintah yang dibagikan; jangan commit berkas backup ke GitHub.
3. **Supabase CLI**: `npx supabase db dump --linked -f backup.sql` (membutuhkan Docker Desktop).
4. **Minimal darurat**: Dashboard → Table Editor → tiap tabel penting → *Export to CSV* (berita, agenda, pengurus, `site_settings`, `donations`, `donation_reports`, `applicants`).

Simpan cadangan di **dua tempat** (mis. disk eksternal + penyimpanan terenkripsi). Cadangan PMB dan aspirasi memuat data pribadi: perlakukan sebagai rahasia.

**Jadwal:** sebelum perubahan besar/migrasi, setiap bulan, dan setiap akhir periode PMB.

## Cadangan Storage
Tidak ada ekspor sekali-klik di paket gratis. Praktik realistis: **simpan berkas asli** (foto/PDF) di folder organisasi sebelum mengunggah; untuk dokumen PMB/proposal, unduh lewat dasbor bila perlu diarsipkan. Jangan menghapus berkas lewat SQL (hanya lewat dasbor/API Storage).

## Uji pemulihan
Setidaknya sekali: buat proyek Supabase gratis kedua (batas 2 proyek), terapkan migrasi 0001–0012, impor cadangan, buka situs yang diarahkan ke proyek itu. Cadangan yang belum pernah diuji pulih belum dapat dipercaya.

## Pemeliharaan rutin
**Mingguan**
- [ ] Situs dapat dibuka dan data tampil (proyek tidak ter-pause)
- [ ] Antrean: aspirasi baru, permohonan kemitraan, pesan kontak, laporan forum, pendaftar PMB

**Bulanan**
- [ ] Tinjau **Log Aktivitas** untuk perubahan janggal
- [ ] Tinjau daftar role istimewa (kueri di docs/04); cabut yang tidak bertugas
- [ ] Periksa pemakaian: Supabase → Reports/Usage (database, Storage, bandwidth, pengguna aktif); Netlify → kredit/bandwidth
- [ ] Buat cadangan database
- [ ] `npm audit` dan perbarui dependensi dengan hati-hati (lalu `npm run build` dan `npm run test:smoke`, deploy)

**Per periode kepengurusan / tahun akademik**
- [ ] Tambah pengurus periode baru; cabut role pengurus lama
- [ ] Tutup periode PMB lama (hapus centang Aktif); arsipkan lalu hapus data pendaftar sesuai kebijakan retensi
- [ ] Perbarui teks profil/visi-misi bila berubah

## Kueri pemeliharaan (SQL Editor)
```sql
-- Pemakaian berkas per bucket
select bucket_id, count(*) as berkas,
       pg_size_pretty(coalesce(sum((metadata->>'size')::bigint),0)) as ukuran
from storage.objects group by bucket_id;

-- Ukuran database dan tabel terbesar
select pg_size_pretty(pg_database_size(current_database())) as db;
select relname, pg_size_pretty(pg_total_relation_size(c.oid)) as ukuran
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by pg_total_relation_size(c.oid) desc limit 10;

-- Berkas yatim (>1 hari, tidak dirujuk data mana pun). HAPUS lewat Dashboard → Storage, bukan SQL.
select o.bucket_id, o.name, o.created_at from storage.objects o
where o.created_at < now() - interval '1 day' and (
  (o.bucket_id='partnership-proposals' and not exists (select 1 from public.partnership_requests r where r.proposal_path = o.name)) or
  (o.bucket_id='aspiration-attachments' and not exists (select 1 from public.aspirations a where a.attachment_path = o.name)) or
  (o.bucket_id='pmb-documents' and not exists (select 1 from public.applicant_documents d where d.file_path = o.name))
) order by o.created_at;
```
Tabel `rate_limits` membersihkan dirinya sendiri (entri >2 hari dihapus berkala oleh fungsi). `audit_logs` bertambah terus; bila membesar, arsipkan entri lama (misalnya >1 tahun) lewat SQL Editor setelah dicadangkan.

## Memperbarui aplikasi
1. Ubah kode di VS Code → `npm run build` → `npm run test:smoke` (bila terpasang).
2. Perubahan skema = **berkas migrasi baru** bernomor berikutnya (`0013_…sql`) lalu `npx supabase db push`. Jangan mengedit migrasi lama yang sudah dijalankan.
3. Jalankan ulang uji SQL setelah migrasi.
4. `git commit` + `git push` → Netlify deploy otomatis.
