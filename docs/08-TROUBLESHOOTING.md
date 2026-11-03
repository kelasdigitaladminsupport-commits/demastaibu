# 8. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Muncul layar **"Konfigurasi Supabase belum diisi"** | `.env.local` kosong / salah nama variabel; di Netlify variabel belum diisi | Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`; **jalankan ulang** `npm run dev` / **deploy ulang** di Netlify |
| Layar **"Kunci rahasia terdeteksi"** | Kunci `service_role`/`secret` terisi di variabel `VITE_` | Ganti dengan kunci **publishable**; **rotate** kunci rahasia tersebut (docs/04) |
| `The syntax of the command is incorrect` saat `supabase link` | Menulis `<ref>` apa adanya di CMD | Ganti dengan project ref asli, tanpa `<` `>` |
| Build Netlify gagal dengan galat versi Node | Node bawaan terlalu lama | `netlify.toml` mengunci `NODE_VERSION = "22"`; pastikan berkas itu ter-commit |
| Situs produksi kosong / data tidak muncul / galat jaringan | Proyek Supabase **di-pause** (paket gratis, ±7 hari tanpa aktivitas) | Dashboard → Restore project; pasang keep-alive (docs/02-G) |
| Daftar/lupa sandi: **email tidak datang** | SMTP bawaan Supabase hanya untuk anggota tim & 2 email/jam | Aktifkan **SMTP kustom** (docs/01-6); cek folder spam |
| Galat **"Email address not authorized"** / "email rate limit exceeded" | Sama seperti di atas | SMTP kustom; atur Authentication → Rate Limits |
| Tautan di email membuka **localhost** atau alamat salah | Site URL/Redirect URLs Supabase belum diganti | docs/02-C |
| Login: "Email belum diverifikasi" | Akun belum klik tautan verifikasi | Minta kirim ulang lewat daftar ulang/lupa sandi; atau Authentication → Users → konfirmasi manual (hanya untuk akun uji) |
| Tombol **Dasbor** tidak muncul setelah diberi role | Role dibaca saat login | Muat ulang halaman atau keluar-masuk lagi |
| `/admin` menampilkan **"Akses ditolak"** | Akun tidak punya role untuk modul itu | Lihat tabel peran (docs/03); Super Admin menambah role |
| Berita tidak tampil di publik | Status masih Draf; waktu tayang di masa depan; kategori/filter aktif | Ubah ke Terbit, kosongkan waktu tayang atau atur ke waktu lampau |
| Agenda/program/galeri tidak tampil | Belum dicentang **Tampilkan** | Centang di dasbor |
| Struktur kosong | Pengurus belum dicentang Tampilkan, atau jabatan/periode belum diisi | Dasbor → Pengurus |
| Forum: tidak bisa membuat topik | Belum ada Kategori Forum, atau diblokir | Buat kategori; cek status akun |
| Forum: "terlalu sering memposting" | Batas 5 topik / 20 komentar per jam | Tunggu; moderator/admin tidak dibatasi |
| Halaman donasi/PMB "belum diaktifkan" | Saklar mati (memang bawaan) | Pengaturan Website setelah syarat docs/03 terpenuhi |
| Donasi tidak tampil di publik | Status bukan *Terverifikasi*, atau *Tampil* belum dicentang, atau saklar donasi mati | Periksa ketiganya |
| PMB: "Tidak ada periode yang sedang dibuka" | Periode tidak Aktif, atau hari ini di luar rentang tanggal, atau tidak ada program studi aktif | Periksa Periode & Program studi |
| Unggah gambar gagal | Format bukan JPG/PNG/WebP; tidak punya izin; bucket/kebijakan belum terpasang | Gunakan format yang didukung; cek role; jalankan migrasi `0007` |
| Unggah PDF gagal | Bukan PDF atau >10 MB (laporan) / >5 MB (proposal, lampiran, dokumen PMB) | Kecilkan berkas |
| "Terlalu banyak percobaan" | Pembatasan laju (kirim aspirasi 5/jam, kontak 3/jam, kemitraan 3/hari, PMB 5/hari, pelacakan 20/10 menit) | Tunggu; bila banyak pengguna satu jaringan, bahas penyesuaian batas |
| Galat 42501 / "permission denied" di Console | RLS menolak (benar secara keamanan) | Periksa role/status data; jangan menonaktifkan RLS |
| `npm run test:smoke` gagal dijalankan | Node < 22.12 atau paket uji belum terpasang | `node -v`; `npm i -D vitest jsdom @testing-library/react @testing-library/dom` |
| Logo baru tidak tampil di semua tempat | Belum menekan **Simpan pengaturan**; cache peramban | Simpan; muat ulang paksa (Ctrl+F5). Ikon tab (favicon) dapat tertahan cache beberapa jam |
| Logo tampil tetapi kotak-kotak/pecah | Berkas bukan gambar valid atau terlalu kecil | Unggah PNG/JPG/WebP yang jelas (≥ 200 px) |
| Logo tidak terlihat di footer/dasbor (latar gelap) | Logo berwarna gelap tanpa latar | Footer/dasbor memberi latar putih di belakang logo; gunakan versi logo yang kontras |
| Ikon media sosial tidak muncul | Kolom kosong / tautan tidak diawali `https://` / belum Simpan | Isi tautan lengkap lalu Simpan pengaturan |
| Layar loading tidak pernah hilang | Permintaan ke Supabase menggantung (proyek di-pause / jaringan putus) | Muat ulang; cek proyek Supabase (docs/02-G); lihat tab Network |
| Layar loading tampil sangat sering | Koneksi lambat: aksi >0,25 dtk memunculkannya | Normal pada jaringan lambat; bilah progres di atas = pemuatan data |
| `/sitemap.xml` atau `/robots.txt` menampilkan halaman situs / 404 | Fungsi Netlify belum terpasang (berkas `netlify/functions` atau `netlify.toml` belum ter-commit) | Pastikan keduanya ada di repositori lalu deploy ulang; cek Netlify → Functions |
| Sitemap hanya berisi halaman statis | Variabel `VITE_SUPABASE_*` tidak tersedia untuk fungsi, atau belum ada berita Terbit | Cek variabel lingkungan di Netlify (cakupan *Functions*); terbitkan berita |
| Pratinjau tautan berita menampilkan beranda | Fungsi `meta` belum aktif atau cache pratinjau lama | Cek aturan `/berita/*` di `netlify.toml`; uji ulang di Facebook Sharing Debugger |
| Halaman berita menampilkan "Layanan sementara tidak tersedia" | Fungsi `meta` gagal mengambil `index.html` | Muat ulang; bila terus terjadi hapus dua aturan `/berita/*` dan `/agenda/*` di `netlify.toml` lalu deploy ulang (docs/09), dan kirimkan galatnya |
| Belum muncul di Google | Belum diindeks (normal pada situs baru) | Ikuti docs/09: Search Console, kirim sitemap, minta pengindeksan; tunggu hari–minggu |
| Jalankan skrip uji SQL: galat di bagian `storage.objects` | Proteksi bawaan Supabase | Hapus baris yang memuat `storage.objects` (docs/01) |

## Cara mencari penyebab
1. **Console peramban (F12 → Console)** dan tab **Network**: lihat respons kegagalan.
2. **Supabase → Logs** (API/Auth/Postgres) untuk galat sisi server.
3. **Dasbor → Log Aktivitas** untuk melihat siapa mengubah apa.
4. Jalankan ulang uji SQL (docs/05) untuk memastikan kebijakan akses utuh.

## Saat meminta bantuan
Sertakan: halaman/alamat URL, langkah yang dilakukan, pesan galat lengkap (teks atau tangkapan layar), peran akun yang dipakai. **Jangan** menyertakan password, kunci rahasia, atau data pribadi pendaftar.
