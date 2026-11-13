# 5. Checklist pengujian

## A. Uji otomatis
| Uji | Cara menjalankan | Cakupan | Hasil terakhir |
|---|---|---|---|
| Akses SQL (6 berkas di `supabase/tests/`) | tempel di Supabase SQL Editor (otomatis ROLLBACK) | RLS per peran (anon, member, editor, moderator, admin, super admin, petugas PMB), RPC, Storage, trigger | 190 lulus |
| Frontend (`tests/smoke`, `tests/unit`) | `npm test` | render 67 rute publik+admin tanpa galat; animasi loading (pindah halaman, login, daftar, reset, simpan, RPC, unggah — memakai klien Supabase asli); logo tersinkron di navbar/footer/favicon; ikon media sosial dan penolakan tautan berbahaya; tag SEO/noindex/kanonik/JSON-LD; sitemap, robots, dan fungsi metadata berita (termasuk serangan injeksi) | 141 lulus |
| Type-check + build | `npm run build` | seluruh TypeScript | lulus |
Peringatan: uji asap memakai data palsu — ia membuktikan halaman **tidak error**, bukan bahwa data nyata tampil benar. Karena itu checklist manual di bawah tetap wajib.

## B. Checklist manual sebelum rilis
Gunakan akun uji dan data berlabel `[UJI]`. Centang setiap butir.

### Umum
- [ ] Semua menu navbar terbuka di desktop dan ponsel; menu "Tentang/Lainnya" berfungsi
- [ ] Halaman 404 muncul pada alamat acak
- [ ] F5 pada alamat dalam (mis. `/berita`) tidak 404 (setelah deploy)
- [ ] Tidak ada galat merah di Console pada halaman utama

### Akun
- [ ] Daftar → email verifikasi **masuk** (SMTP kustom aktif) → login berhasil
- [ ] Lupa kata sandi → email masuk → kata sandi baru berhasil
- [ ] Member tidak bisa membuka `/admin`; anonim diarahkan ke `/masuk`

### Loading, logo, media sosial, SEO
- [ ] Klik tiap menu navbar: bilah progres di atas / layar loading bermerek muncul pada pemuatan yang terasa lambat, lalu hilang
- [ ] Login, logout, daftar, lupa sandi, simpan di dasbor, unggah gambar: ada animasi loading dan tombol tidak bisa diklik ganda
- [ ] Unggah logo di Pengaturan Website → tampil di navbar, footer, halaman masuk, sidebar dasbor, animasi loading, bukti PMB, dan tab peramban
- [ ] Ganti logo lagi → semua tempat ikut berubah (muat ulang bila perlu)
- [ ] Isi tautan Instagram/TikTok/YouTube → ikon muncul di bawah logo footer; klik membuka akun yang benar di tab baru; kosongkan → ikon hilang
- [ ] `/sitemap.xml` dan `/robots.txt` tampil; berita Terbit ada di sitemap, Draf tidak
- [ ] Bagikan tautan sebuah berita ke WhatsApp → pratinjau menampilkan judul + gambar berita itu
- [ ] Search Console: properti terverifikasi, sitemap berstatus Success (docs/09)

### Konten publik
- [ ] Profil, Visi & Misi tampil dari pengaturan
- [ ] Struktur & Bidang tampil per periode; foto tampil
- [ ] Berita: cari, filter kategori, pagination, detail, tombol bagikan
- [ ] Berita **Draf** tidak tampil di publik (uji juga saat login sebagai admin)
- [ ] Berita berjadwal masa depan tidak tampil sebelum waktunya
- [ ] Agenda (mendatang/selesai), detail, dokumentasi galeri
- [ ] Program, Galeri (pratinjau foto), Pengabdian, Laporan (unduh PDF)
- [ ] Kontak: kirim pesan → muncul di dasbor Pesan Kontak

### Dasbor
- [ ] Tiap role hanya melihat menu yang sesuai (uji Editor, Moderator, Petugas PMB, Admin)
- [ ] CRUD: tambah, ubah, hapus untuk berita, agenda, program, galeri (multi-foto), laporan, pengurus
- [ ] Unggah foto besar (>5 MB dari ponsel) berhasil (otomatis dikecilkan); PDF >10 MB ditolak
- [ ] Log Aktivitas mencatat perubahan di atas
- [ ] Super Admin terakhir tidak bisa dicabut

### Aspirasi
- [ ] Kirim anonim → kode tiket → lacak berhasil
- [ ] Anonim tidak bisa melampirkan berkas; login + identitas bisa
- [ ] Moderator: ubah status, tanggapan publik, catatan internal; pengirim **tidak** melihat catatan internal
- [ ] "Aspirasi Publik" hanya menampilkan yang dicentang dan tanpa identitas

### Forum
- [ ] Buat topik, komentar, balasan, suka, laporkan
- [ ] Moderator: sembunyikan komentar/topik, tutup diskusi (komentar baru ditolak), sematkan, bahan evaluasi
- [ ] Akun diblokir tidak bisa memposting

### Kemitraan, donasi
- [ ] Ajukan kemitraan (dengan PDF) → nomor `KRJ-…` → lacak dengan nomor + email
- [ ] Sponsor tanpa izin publikasi ditolak tayang; dengan izin tampil di "Mitra kami"
- [ ] Donasi: saklar mati → halaman terkunci; saklar aktif → hanya donasi *Terverifikasi + Tampil*; nama "Anonim" tanpa izin
- [ ] Laporan donasi hanya tayang setelah "Setujui dan tayangkan"

### PMB (hanya di lingkungan uji / sebelum diaktifkan resmi)
- [ ] Saklar mati: `/pmb` terkunci, pendaftaran ditolak
- [ ] Daftar (login) → nomor + kode pelacakan (ditampilkan sekali) → unggah dokumen → cetak bukti
- [ ] Pelacakan dengan kode benar/salah; tidak membocorkan data pribadi
- [ ] Petugas: lihat data/dokumen, ubah status + catatan, riwayat tidak ganda, ekspor CSV tercatat di log
- [ ] Setelah *Terverifikasi*, pendaftar tidak bisa mengubah data
- [ ] Admin biasa **tidak** melihat data pendaftar
- [ ] Data/berkas uji dibersihkan setelah selesai

## C. Go / No-go peluncuran
- [ ] SMTP kustom aktif dan teruji ke email nyata
- [ ] Site URL & Redirect URLs Supabase = alamat produksi
- [ ] Hanya kunci publishable di Netlify; tidak ada rahasia di GitHub
- [ ] Query RLS (docs/04) kosong; uji SQL lulus
- [ ] Data uji `[UJI]` dibersihkan (SQL + berkas Storage)
- [ ] PMB & donasi **nonaktif** kecuali persyaratan docs/03 terpenuhi
- [ ] Teks Kebijakan Privasi dan Aturan Komunitas ditinjau pihak berwenang
- [ ] Minimal 2 Super Admin; role lain sesuai tugas
- [ ] Cadangan pertama dibuat (docs/07)
- [ ] Rencana menjaga proyek gratis tidak "tertidur" ditetapkan (docs/02-G)
