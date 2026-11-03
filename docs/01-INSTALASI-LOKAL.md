# 1. Instalasi dan pengembangan lokal

## Prasyarat
- **Node.js 22 LTS** (minimal 20.19; uji asap membutuhkan 22.12+). Cek: `node -v`
- Git, Visual Studio Code
- Akun Supabase (gratis), GitHub, Netlify

## Langkah 1 — Buat proyek Supabase
1. supabase.com → New project. Pilih region terdekat (mis. Southeast Asia/Singapore).
2. **Catat password database** yang Anda buat (dibutuhkan saat `supabase link`). Jangan dibagikan.
3. Buka **Project Settings → API** (atau API Keys). Salin:
   - **Project URL** (`https://xxxx.supabase.co`) → bagian `xxxx` adalah *project ref*.
   - **Publishable / anon key** → untuk frontend.
   - ⚠️ **service_role / secret key: JANGAN dipakai di proyek ini sama sekali.**

## Langkah 2 — Isi `.env.local`
Salin `.env.example` menjadi `.env.local` (Windows CMD: `copy .env.example .env.local`) lalu isi:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```
Dua variabel lain bersifat **opsional** (SEO): `VITE_SITE_URL` dan `VITE_GOOGLE_SITE_VERIFICATION` — biasanya diisi di Netlify, bukan di sini (docs/09).

`.env.local` sudah masuk `.gitignore` (pola `*.local`). Cek dengan `git status` — file ini tidak boleh muncul.

## Langkah 3 — Terapkan skema database
Cara A (disarankan), di terminal proyek:
```
npx supabase login
npx supabase link --project-ref xxxx
npx supabase db push
```
Ketik `Y` bila diminta. **Ganti `xxxx` dengan project ref asli — jangan menulis `<ref>`** (tanda `<` `>` dianggap perintah oleh CMD Windows).

Cara B: buka **SQL Editor** Supabase, tempel isi `supabase/migrations/0001…0012` **berurutan** satu per satu lalu Run.

## Langkah 4 — Verifikasi keamanan database
Di SQL Editor jalankan; hasilnya harus **kosong**:
```sql
select tablename from pg_tables where schemaname='public' and not rowsecurity;
```
Lalu tempel dan jalankan, satu per satu, berkas di `supabase/tests/` (`rls_test.sql`, `admin_write_test.sql`, `admin_5b_test.sql`, `stage6_test.sql`, `stage7_test.sql`, `stage8_test.sql`). Semua baris harus berawalan `ok -` dan tidak ada `FAIL`. Skrip ini otomatis dibatalkan (ROLLBACK), tidak meninggalkan data.
> Beberapa uji menyisipkan baris langsung ke `storage.objects` untuk menguji kebijakan Storage. Bila SQL Editor menolaknya (mis. karena proteksi bawaan Supabase) dan skrip berhenti dengan galat, hapus baris yang mengandung `storage.objects` lalu jalankan ulang. Kebijakan Storage lalu diuji lewat checklist manual (docs/05): unggah gambar sebagai Editor, coba unggah sebagai Member (harus ditolak), dan seterusnya.

## Langkah 5 — Buat admin pertama (aman)
1. Dashboard Supabase → **Authentication → Users → Add user**. Isi email + kata sandi kuat, centang **Auto Confirm User**.
2. SQL Editor (berjalan sebagai pemilik database, melewati RLS):
```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'EMAIL_ANDA@contoh.com'
on conflict do nothing;
```
3. Role lain (admin, editor, moderator, petugas PMB) diberikan Super Admin lewat **Dasbor → Pengguna & Role**. Tidak ada jalur dari website untuk memberi diri sendiri role.
4. Super Admin terakhir tidak bisa dicabut lewat website (dijaga trigger database).

## Langkah 6 — Pengaturan Authentication (WAJIB)
Menu Supabase: **Authentication** (nama submenu bisa sedikit berbeda antar versi dashboard).
| Pengaturan | Nilai |
|---|---|
| Confirm email | **Aktif** |
| Allow anonymous sign-ins | **Nonaktif** |
| Site URL | `http://localhost:5173` saat pengembangan; ganti ke alamat Netlify saat produksi |
| Redirect URLs | `http://localhost:5173/**` dan (nanti) `https://NAMA-SITUS.netlify.app/**` |
| **SMTP kustom** | **Wajib sebelum dibuka untuk mahasiswa** — lihat di bawah |

### ⚠️ SMTP kustom wajib untuk produksi
Layanan email bawaan Supabase hanya untuk uji coba: **hanya mengirim ke anggota tim proyek Anda dan dibatasi 2 email per jam** (menurut dokumentasi Supabase). Tanpa SMTP kustom, mahasiswa **tidak akan menerima email verifikasi atau reset kata sandi**, dan Anda akan melihat galat "Email address not authorized" atau "email rate limit exceeded".

Solusi: **Authentication → Emails → SMTP Settings → Enable custom SMTP**, isi dengan penyedia email (mis. Brevo, Resend, atau SMTP lain). Gunakan alamat pengirim pada domain yang terotentikasi (SPF/DKIM) agar tidak masuk spam. Setelah aktif, batas per jam dapat diatur di **Authentication → Rate Limits**.

Opsional tetapi disarankan: aktifkan CAPTCHA di **Authentication → Attack Protection** (hCaptcha/Turnstile). Catatan: bila Anda mengaktifkannya, formulir login/daftar di website perlu penyesuaian untuk mengirim token CAPTCHA — minta bantuan pengembang.

## Langkah 7 — Jalankan
```
npm install
npm run dev
```
Buka `http://localhost:5173`. Tanpa `.env.local`, layar panduan konfigurasi muncul (bukan halaman putih).

## Langkah 8 — Isi data awal (urutan disarankan)
1. Dasbor → **Pengaturan Website**: **logo**, kontak resmi, media sosial (ikon tampil di footer).
2. **Profil, Visi & Misi**.
3. **Bidang** → **Jabatan** (sudah ada 6 jabatan bawaan) → **Pengurus** (dengan izin yang bersangkutan).
4. **Kategori Berita** → **Berita**; **Agenda**; **Program Kerja**; **Galeri**; **Laporan**.
5. **Kategori Forum** (tanpa ini forum tidak bisa dipakai).
6. PMB dan donasi: **jangan diaktifkan** sebelum syaratnya terpenuhi (docs/03).

Ingin melihat tampilan dengan data contoh? Jalankan `supabase/seed_data_uji.sql`, dan **bersihkan** dengan `supabase/cleanup_data_uji.sql` sebelum publikasi. Beri tanda `[UJI]` pada data uji buatan Anda sendiri agar ikut terhapus.

## Catatan teknis
- Klien Supabase tidak memakai tipe hasil `supabase gen types`; tidak perlu menjalankannya.
- Perintah: `npm run dev` · `npm run build` · `npm run preview` (uji build lokal) · `npm test`.
- Setelah menimpa proyek dengan versi baru, jalankan `npm install` (ada pustaka ikon `simple-icons` dan pustaka uji).
