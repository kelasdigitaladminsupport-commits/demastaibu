# Supabase — migrasi, uji, dan skrip pendukung

## Migrasi (jalankan berurutan: `npx supabase db push` atau SQL Editor)
| Berkas | Isi |
|---|---|
| 0001_core.sql | ekstensi, role, profil, organisasi, `site_settings`, pembatasan laju, kode unik, audit |
| 0002_content.sql | berita, agenda, program, galeri, pengabdian, laporan, kontak, notifikasi |
| 0003_community.sql | aspirasi, forum (+penjaga spam), kemitraan, sponsor, donasi |
| 0004_pmb.sql | periode, program studi, pendaftar, dokumen, riwayat status |
| 0005_rls.sql | Row Level Security seluruh tabel + view publik |
| 0006_rpc.sql | RPC kirim/lacak (aspirasi, kontak, kemitraan, PMB) + GRANT |
| 0007_storage.sql | bucket + kebijakan Storage |
| 0008_triggers_grants.sql | `updated_at`, trigger audit, pengetatan GRANT |
| 0009_guard_last_super_admin.sql | super admin terakhir tidak dapat dicabut |
| 0010_staff_directory.sql | daftar staf untuk penanggung jawab |
| 0011_donation_summary.sql | ringkasan total donasi publik |
| 0012_pmb_staff_rpc.sql | ubah status PMB + catatan; pencatatan ekspor |

Perubahan skema ke depan = berkas baru bernomor berikutnya. Jangan mengedit migrasi lama.

## Uji akses (`tests/`) — aman: semuanya di-ROLLBACK
`rls_test.sql`, `admin_write_test.sql`, `admin_5b_test.sql`, `stage6_test.sql`, `stage7_test.sql`, `stage8_test.sql` (190 pemeriksaan). Tempel di SQL Editor; semua baris harus `ok - …`. Lihat docs/05 dan catatan Storage di docs/01.

## Skrip pendukung
- `seed_data_uji.sql` — data contoh bertanda `[UJI]` untuk melihat tampilan.
- `cleanup_data_uji.sql` — menghapus semua data bertanda `[UJI]` (berkas Storage dihapus manual).

## Verifikasi RLS
```sql
select tablename from pg_tables where schemaname='public' and not rowsecurity;  -- harus kosong
```

## Admin pertama
Lihat docs/01-INSTALASI-LOKAL.md (Langkah 5).
