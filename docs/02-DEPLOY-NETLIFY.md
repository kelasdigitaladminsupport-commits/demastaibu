# 2. Deploy ke Netlify (GitHub → Netlify → Supabase Auth)

## A. Kirim kode ke GitHub
```
git init                      # lewati bila sudah ada
git add .
git status                    # PERIKSA: .env.local TIDAK boleh ada dalam daftar
git commit -m "Website DEMA"
git branch -M main
git remote add origin https://github.com/AKUN/NAMA-REPO.git
git push -u origin main
```
- Jangan pernah commit `.env.local`, kunci `service_role`, atau password database. Bila terlanjur ter-commit: anggap rahasia **bocor** → lihat docs/04 (penanganan insiden), jangan hanya menghapus berkasnya.
- Repositori boleh privat.

## B. Buat situs di Netlify
1. Netlify → **Add new site → Import an existing project → GitHub** → pilih repositori.
2. Pengaturan build (sudah diatur oleh `netlify.toml`, cukup dicek):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node: 22 (dikunci di `netlify.toml`)
3. **Site configuration → Environment variables**, tambahkan dua variabel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   Isi sama dengan `.env.local`. Hanya kunci **publishable**. Variabel berawalan `VITE_` terlihat publik di browser — itu sebabnya `service_role` dilarang.
   Opsional untuk SEO: `VITE_SITE_URL` (hanya bila memakai domain sendiri) dan `VITE_GOOGLE_SITE_VERIFICATION` (docs/09).
4. **Deploy**. Variabel lingkungan hanya terbaca saat *build*: bila Anda mengubahnya, jalankan deploy ulang.

### Kuota gratis Netlify (periksa akun Anda)
Menurut informasi publik per 2026, akun baru (dibuat setelah 4 Sep 2025) memakai **sistem kredit: 300 kredit/bulan sebagai batas keras**, dan tiap *production deploy* yang berhasil memakai sekitar 15 kredit (bandwidth ikut memakai kredit). Akun lama dapat masih memakai model lama (100 GB bandwidth + 300 menit build). Cek di dashboard Netlify akun Anda.
Praktik hemat: gabungkan beberapa perubahan dalam satu push, jangan deploy untuk setiap perubahan kecil, dan matikan deploy otomatis untuk branch selain `main` bila tidak dibutuhkan. Gambar dan PDF disajikan langsung dari Supabase Storage, bukan dari Netlify.

## C. Hubungkan alamat Netlify dengan Supabase Auth (WAJIB)
Tanpa langkah ini, tautan di email verifikasi/reset kata sandi mengarah ke alamat yang salah.
1. (Opsional) Ubah nama situs: **Site configuration → Site details → Change site name** → mis. `dema-stai-bu` → alamatnya `https://dema-stai-bu.netlify.app`. Ini domain gratis Netlify.
2. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://dema-stai-bu.netlify.app`
   - **Redirect URLs** (tambahkan semuanya):
     - `https://dema-stai-bu.netlify.app/**`
     - `http://localhost:5173/**` (agar pengembangan lokal tetap jalan)
3. Pastikan **SMTP kustom** sudah aktif (docs/01, Langkah 6).

## D. Uji pasca-deploy
- [ ] Beranda terbuka; buka langsung `https://…netlify.app/berita` lalu tekan **F5** → halaman tetap terbuka (bukan 404). Ini membuktikan aturan redirect SPA bekerja.
- [ ] Daftar akun uji dengan email nyata → email verifikasi **masuk** → tautan membuka situs produksi (bukan localhost) → bisa login.
- [ ] "Lupa kata sandi" → email masuk → tautan membuka `/reset-password` → kata sandi berubah.
- [ ] Login Super Admin → tombol **Dasbor** muncul → `/admin` terbuka.
- [ ] Akun member **tidak** bisa membuka `/admin`.
- [ ] Unggah gambar di Berita → tampil di situs publik.
- [ ] Kirim aspirasi anonim → dapat kode tiket → pelacakan berfungsi.
- [ ] Buka Console peramban (F12) di tiap halaman utama — catat peringatan "Content Security Policy" (lihat E).
- [ ] Uji dari ponsel.
- [ ] Buka `/sitemap.xml` dan `/robots.txt` (harus tampil; lihat docs/09). Netlify → **Functions** menampilkan `sitemap`, `robots`, `meta`.
- [ ] Logo di Pengaturan Website tampil di navbar, footer, dan tab peramban.
- [ ] Animasi loading muncul saat pindah halaman dan login.

## E. Mengaktifkan Content-Security-Policy (setelah uji)
`netlify.toml` sudah memuat `Content-Security-Policy-Report-Only` (hanya melapor, tidak memblokir). Bila semua halaman bersih dari pelanggaran di Console, ubah nama header menjadi `Content-Security-Policy`, commit, push. Bila ada pelanggaran yang sah (mis. Anda menambah sumber gambar eksternal), tambahkan domainnya ke direktif yang sesuai terlebih dahulu.

## F. Domain sendiri (opsional)
Netlify → **Domain management → Add a domain**, ikuti petunjuk DNS. Setelah aktif, **ulangi langkah C** dengan domain baru (Site URL + Redirect URLs).

## G. Mencegah proyek Supabase "tertidur"
Proyek **gratis** Supabase di-*pause* otomatis setelah sekitar 7 hari tanpa aktivitas (menurut informasi publik 2026); situs akan gagal memuat data sampai dipulihkan manual. Pilihan: (1) paket berbayar, (2) pastikan ada aktivitas rutin, atau (3) pasang *keep-alive* sederhana — contoh GitHub Actions ada di `docs/contoh/keepalive.yml` (periksa ketentuan layanan Supabase). Bila proyek ter-pause: Dashboard → **Restore project**.
