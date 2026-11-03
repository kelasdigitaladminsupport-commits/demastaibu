# 4. Keamanan

## Model singkat
| Lapisan | Perlindungan |
|---|---|
| Database | **Row Level Security** aktif pada seluruh tabel (36 tabel di schema public; 165 kebijakan termasuk Storage); akses default tertutup |
| Peran | Tabel `user_roles` + fungsi `SECURITY DEFINER`; role tidak pernah dibaca dari data yang dapat diubah pengguna; hanya Super Admin yang dapat memberi role |
| Aksi publik | Kirim aspirasi/kontak/kemitraan/PMB hanya lewat fungsi (RPC) dengan validasi + pembatasan laju; tabel tujuan tidak punya kebijakan INSERT untuk publik |
| Berkas | Bucket publik hanya untuk konten tayang; bucket privat (lampiran aspirasi, proposal, dokumen PMB) dengan kebijakan per pemilik/peran; batas ukuran dan jenis berkas di server |
| Rahasia | Tidak ada `service_role` di frontend/repo; aplikasi berhenti dan memperingatkan bila kunci rahasia terdeteksi di variabel `VITE_` |
| Audit | Perubahan data penting dicatat trigger database (tidak dapat dihapus dari website); ekspor PMB wajib tercatat |
| Anti-spam | Batas laju per IP/akun pada RPC; batas topik/komentar per jam di database; honeypot pada formulir publik |
| Header | `nosniff`, `X-Frame-Options`, HSTS, kebijakan referrer; CSP mode lapor (lihat docs/02-E) |

Hasil pemeriksaan terakhir (otomatis): 190 uji akses SQL lulus; 141 uji frontend lulus (render halaman, loading, logo, SEO, fungsi Netlify); `npm audit` = 0 kerentanan; tidak ditemukan `dangerouslySetInnerHTML`/`eval`; tidak ada kunci rahasia di kode.

## Tambahan: logo, media sosial, SEO, loading
- **Tautan media sosial** hanya dirender bila `http(s)`; `javascript:`/`data:` ditolak (teruji). Tautan dibuka dengan `rel="noopener noreferrer nofollow"`.
- **Logo** diunggah ke bucket `public-media` oleh peran berwenang saja (kebijakan Storage); format dibatasi di server (SVG tidak diterima karena dapat memuat skrip).
- **Fungsi `meta`** menyisipkan judul/ringkasan berita ke HTML: semua teks dilolosi (HTML/atribut) dan data terstruktur dinetralkan dari `</script>`; slug divalidasi ketat sebelum menyentuh database; hanya konten yang sudah tayang yang diambil (kunci publishable + RLS). Perlindungan ini diuji dengan *uji mutasi* (dengan sengaja dimatikan → ujinya gagal).
- **Pelacak loading** hanya menghitung jumlah permintaan; tidak menyimpan alamat, isi, atau data pengguna.
- **Cache logo di peramban** (`localStorage`, kunci `dema:logo`) hanya berisi nama berkas logo publik — preferensi tampilan, bukan data sensitif.
- CSP (mode lapor) sudah mencakup sumber gambar Supabase; data terstruktur (`application/ld+json`) bukan skrip yang dieksekusi sehingga tidak melanggar CSP.

## Verifikasi mandiri (jalankan berkala di SQL Editor)
```sql
-- harus kosong: tabel tanpa RLS
select tablename from pg_tables where schemaname='public' and not rowsecurity;
-- siapa saja yang punya role istimewa
select p.email, r.role from public.user_roles r join public.profiles p on p.id=r.user_id where r.role <> 'member' order by r.role;
```
Dan jalankan ulang `supabase/tests/*.sql` setelah setiap perubahan skema.

## Batasan yang perlu Anda ketahui (jujur)
1. **Anonimitas aspirasi tidak mutlak.** Identitas tidak disimpan pada data aspirasi, tetapi penyedia infrastruktur dapat mencatat metadata jaringan (IP) pada log mereka. Teks ini sudah ditampilkan di formulir.
2. **Pembatasan laju berbasis IP bergantung pada header `cf-connecting-ip`** yang diteruskan Supabase. Saya tidak dapat memverifikasinya di proyek Anda. Cek: kirim permintaan ke API dan lihat `select current_setting('request.headers', true)` dalam sebuah fungsi uji; bila header berbeda, sesuaikan fungsi `client_key()`. Untuk pengguna login, pembatasan memakai id akun (tidak bergantung header).
3. **Tidak ada MFA untuk akun admin di dalam aplikasi.** Kompensasi: kata sandi kuat dan unik, jumlah admin minimal, akun Supabase/GitHub/Netlify Anda sendiri dengan 2FA aktif.
4. **Kode dasbor ikut terunduh ke peramban** (semua aplikasi web begitu), tetapi tidak berguna tanpa izin: data dilindungi RLS di server.
5. **Berkas yatim** (unggahan yang pengajuannya gagal) dapat tertinggal di Storage; bersihkan berkala (docs/07).
6. **Email bawaan Supabase tidak untuk produksi** — wajib SMTP kustom (docs/01).
7. **Pesan "Terlalu banyak percobaan"** dapat mengenai pengguna sah yang berbagi satu jaringan (mis. kampus) pada fungsi publik tertentu; batasnya sengaja konservatif.
8. Isi berita/forum ditampilkan sebagai **teks biasa** (tanpa HTML) untuk mencegah XSS.

## Penanganan insiden
**Kunci rahasia (service_role/secret) atau password database bocor** (mis. ter-commit ke GitHub):
1. Supabase → Project Settings → API Keys / Database: **rotate/reset** kunci dan password sekarang juga.
2. Hapus dari repositori **dan riwayat git** (menghapus berkas saja tidak cukup); anggap sudah diketahui orang lain.
3. Periksa Log Aktivitas dan log Supabase untuk aktivitas janggal.

**Akun admin diduga diambil alih:**
1. Super Admin lain mencabut role akun itu (Pengguna & Role) dan memblokirnya; ganti kata sandi lewat Supabase → Authentication → Users.
2. Tinjau Log Aktivitas untuk perubahan oleh akun itu; kembalikan data bila perlu.
3. Bila yang diambil alih adalah satu-satunya Super Admin: gunakan SQL Editor (pemilik database) untuk mengatur ulang role.

**Data pribadi tayang tanpa sengaja:** nonaktifkan/sembunyikan kontennya di dasbor (ubah ke Draf/hapus centang Tampilkan), periksa Log Aktivitas, lalu informasikan pihak berwenang sesuai kebijakan privasi kampus.

**Kunci publishable terlihat orang lain:** normal; kunci itu memang publik dan dibatasi RLS. Tidak perlu diganti.

## Praktik rutin
- Tinjau daftar role istimewa tiap bulan; cabut yang tidak lagi bertugas.
- `npm audit` sebelum deploy; perbarui dependensi secara terkendali.
- Jangan menonaktifkan RLS "sementara" untuk menyelesaikan galat — perbaiki kebijakannya.
- Hapus data uji sebelum dan sesudah peluncuran.
