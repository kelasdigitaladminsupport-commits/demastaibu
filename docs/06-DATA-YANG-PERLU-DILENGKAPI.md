# 6. Informasi yang perlu dilengkapi organisasi

Website **sengaja tidak mengisi** data resmi apa pun. Siapkan hal-hal berikut (isi lewat Dasbor).

## Wajib sebelum peluncuran
| Data | Dasbor → menu | Catatan |
|---|---|---|
| Logo resmi | Pengaturan Website → Logo | PNG transparan; sebelum diunggah tampil huruf "D" sementara |
| Gambar pratinjau tautan (1200×630) | ganti berkas `public/og-default.png` (perlu pengembang) | desain resmi; saat ini kartu teks sederhana |
| Kode verifikasi Google Search Console | Netlify → variabel `VITE_GOOGLE_SITE_VERIFICATION` | docs/09 |
| Domain sendiri / subdomain kampus (opsional) | Netlify + `VITE_SITE_URL` | meminta bantuan pihak kampus |
| Profil organisasi | Profil, Visi & Misi | teks resmi |
| Visi dan misi | Profil, Visi & Misi | resmi; satu misi per baris |
| Bidang dan deskripsinya | Bidang | |
| Pengurus: nama, jabatan, bidang, periode, deskripsi tugas | Pengurus | **foto hanya dengan izin**; jangan simpan kontak pribadi |
| Kontak resmi: email, telepon, alamat | Pengaturan Website | |
| Media sosial resmi (Instagram, TikTok, YouTube, Facebook, X, WhatsApp, Telegram, Threads) | Pengaturan Website | tautan lengkap `https://…`; tampil sebagai ikon di footer |
| Kebijakan Privasi final | Pengaturan Website → Teks hukum | bila ingin mengganti teks standar; tinjau oleh pihak berwenang |
| Aturan Komunitas final | Pengaturan Website → Teks hukum | |
| Kategori berita & kategori forum | Kategori Berita / Forum | |
| SMTP (email pengirim) | Supabase → Authentication → SMTP | domain/pengirim organisasi |

## Konten rutin
Berita, agenda, program kerja, galeri, pengabdian, laporan kegiatan/evaluasi.

## Hanya jika fitur diaktifkan
**Donasi** (docs/03): kebijakan pengelolaan donasi; kanal/rekening resmi yang disahkan; penanggung jawab keuangan; format laporan.

**PMB** (docs/03): persetujuan resmi kampus; tahun akademik; nama periode/gelombang; tanggal buka-tutup; **program studi resmi** (nama, jenjang); **persyaratan**; **jadwal**; biaya (bila akan dicantumkan); daftar dokumen yang diminta; penanggung jawab dan kebijakan retensi data pendaftar; siapa Petugas PMB.

**Kemitraan:** kebijakan penerimaan sponsor (mis. kriteria yang ditolak), alamat email penanggung jawab kemitraan.

## Keputusan organisasi
- Siapa Super Admin (minimal 2 orang) dan siapa pemegang role lain.
- Masa berlaku akses admin (dicabut saat jabatan berakhir).
- Siapa yang menjawab aspirasi dan berapa target waktu tanggapan.
