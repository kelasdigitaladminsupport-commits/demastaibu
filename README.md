# Website Resmi DEMA STAI Bahriyatul Ulum KH. Zainul Arifin Pandan

Portal informasi, aspirasi, forum, kemitraan, donasi (transparansi), dan PMB untuk DEMA.

**Teknologi:** React 19 · Vite · TypeScript · Tailwind CSS 4 · React Router · TanStack Query · Supabase (PostgreSQL, Auth, Storage, RLS) · Netlify (hosting + fungsi untuk SEO).

**Fitur tampilan:** animasi loading bermerek untuk setiap aksi (pindah halaman, login, logout, simpan, unggah), logo yang dapat diganti dari Pengaturan Website dan tersinkron di seluruh situs, ikon media sosial di footer, serta SEO (sitemap, robots, pratinjau tautan, data terstruktur).

## Mulai cepat

```bash
npm install
cp .env.example .env.local      # Windows CMD: copy .env.example .env.local   lalu isi nilainya
npm run dev                     # http://localhost:5173
npm run build                   # build produksi ke folder dist/
```

Variabel yang dibutuhkan (`.env.local`, **tidak pernah di-commit**):

| Variabel | Isi |
|---|---|
| `VITE_SUPABASE_URL` | URL proyek Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | kunci **publishable/anon**. **Jangan** isi `service_role`/`secret` |
| `VITE_SITE_URL` *(opsional)* | alamat utama situs (mis. domain sendiri). Bila kosong, memakai alamat Netlify |
| `VITE_GOOGLE_SITE_VERIFICATION` *(opsional)* | kode verifikasi Google Search Console (docs/09) |

## Dokumentasi

| Berkas | Isi |
|---|---|
| [docs/01-INSTALASI-LOKAL.md](docs/01-INSTALASI-LOKAL.md) | Pasang dari nol: Supabase, migrasi, admin pertama, pengaturan Auth, VS Code |
| [docs/02-DEPLOY-NETLIFY.md](docs/02-DEPLOY-NETLIFY.md) | GitHub, Netlify, URL Supabase Auth, domain gratis, uji pasca-deploy |
| [docs/03-PANDUAN-PENGELOLA.md](docs/03-PANDUAN-PENGELOLA.md) | Peran, alur kerja harian, mengaktifkan PMB dan donasi |
| [docs/04-KEAMANAN.md](docs/04-KEAMANAN.md) | Model keamanan, batasan, penanganan insiden |
| [docs/05-CHECKLIST-PENGUJIAN.md](docs/05-CHECKLIST-PENGUJIAN.md) | Uji otomatis dan checklist manual sebelum rilis |
| [docs/06-DATA-YANG-PERLU-DILENGKAPI.md](docs/06-DATA-YANG-PERLU-DILENGKAPI.md) | Informasi resmi yang harus disiapkan organisasi |
| [docs/07-BACKUP-PEMELIHARAAN.md](docs/07-BACKUP-PEMELIHARAAN.md) | Cadangan data dan perawatan rutin |
| [docs/08-TROUBLESHOOTING.md](docs/08-TROUBLESHOOTING.md) | Gejala umum dan solusinya |
| [docs/09-SEO-GOOGLE.md](docs/09-SEO-GOOGLE.md) | Agar muncul di Google, pratinjau tautan, Search Console |

## Struktur proyek

```
src/
  components/   komponen UI bersama (ui/), Navbar, Footer, kartu
  layouts/      PublicLayout, AuthLayout, AdminLayout
  pages/        public/  auth/  admin/
  routes/       daftar rute + ProtectedRoute (cek login & role)
  features/     auth, settings, officers, aspirations, forum, partnerships, pmb, admin (mesin CRUD)
  hooks/ lib/ services/ types/ utils/ styles/
netlify/functions/   sitemap.mjs, robots.mjs, meta.mjs (SEO dinamis)
supabase/
  migrations/   0001–0012 (skema, RLS, RPC, Storage, trigger)
  tests/        uji akses SQL (aman: selalu di-ROLLBACK)
  seed_data_uji.sql, cleanup_data_uji.sql
tests/smoke/    uji asap: merender semua halaman dengan Supabase palsu
tests/unit/     uji unit: loading global, logo, ikon sosmed, SEO, fungsi Netlify
docs/           panduan
```

## Perintah pengujian

```bash
npm install        # pustaka uji sudah ada di package.json (perlu Node 22.12+)
npm test           # 141 uji frontend (render halaman, loading, logo, SEO, fungsi Netlify)
```
Uji SQL (190 pemeriksaan) dijalankan di Supabase SQL Editor (lihat docs/05).

## Prinsip penting

- Keamanan ada di **database (RLS)**, bukan di tombol yang disembunyikan di layar.
- Tidak ada data karangan: profil, pengurus, kontak, rekening, biaya, program studi, dan jadwal diisi pihak berwenang.
- PMB dan donasi **nonaktif** sampai diaktifkan di Pengaturan Website.
- Website **tidak memproses pembayaran**.
