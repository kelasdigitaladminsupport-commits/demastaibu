# 3. Panduan pengelola

## Peran dan hak akses
Akses diatur di **database**; menu yang tersembunyi hanyalah kenyamanan tampilan.

| Peran | Dapat mengelola |
|---|---|
| **Super Admin** | Semuanya. Satu-satunya yang dapat memberi/mencabut role, memblokir akun, dan melihat data pendaftar PMB (bersama Petugas PMB) |
| **Admin** | Profil/visi/misi, bidang, jabatan, pengurus, pengaturan website, log aktivitas, sponsorship, donasi, pesan kontak, konten, aspirasi, forum, periode & program studi PMB. **Tidak** dapat: memberi role, membuka data pendaftar PMB |
| **Editor** | Berita, kategori, agenda, program kerja, galeri, pengabdian, laporan |
| **Moderator** | Aspirasi (tinjau, tanggapi, catatan internal) dan Forum (laporan, sembunyikan, tutup, sematkan) |
| **Petugas PMB** | Data pendaftar PMB, ubah status, ekspor; periode dan program studi |
| **Anggota** | Menulis di forum, mengirim aspirasi dengan identitas, mendaftar PMB |

Prinsip: berikan role **seminimal** yang dibutuhkan, dan cabut saat jabatan berakhir (Dasbor → Pengguna & Role).

## Logo dan media sosial (Pengaturan Website)
- **Logo:** Dasbor → Pengaturan Website → *Logo website* → **Unggah gambar** → **Simpan pengaturan**. Satu unggahan otomatis dipakai di: navbar, footer, halaman masuk/daftar, sidebar dasbor, animasi loading, bukti pendaftaran PMB, ikon tab peramban (favicon), dan data terstruktur untuk Google. Tidak perlu mengubah apa pun di tempat lain.
  - Disarankan PNG berlatar transparan yang jelas di latar putih dan hijau tua. Format JPG/PNG/WebP, otomatis dikecilkan (maks. 600 px). SVG tidak didukung demi keamanan.
  - Logo lama otomatis dihapus dari penyimpanan. Perubahan terlihat pengunjung dalam ±1 menit; ikon tab kadang tertahan cache peramban lebih lama.
  - Pakai **logo resmi** organisasi.
- **Media sosial:** isi tautan lengkap (`https://…`) untuk Instagram, TikTok, YouTube, Facebook, X, WhatsApp, Telegram, dan/atau Threads. Yang terisi tampil sebagai ikon **di bawah logo pada footer** dan membuka akun di tab baru; yang dikosongkan tidak tampil. Hanya tautan `http(s)` yang diterima. Tautan yang sama juga dikirim ke Google sebagai akun resmi organisasi.

## Alur kerja konten
- **Berita:** simpan sebagai *Draf* → periksa → ubah ke *Terbit*. Isi waktu tayang mendatang untuk menjadwalkan. Isi berita berupa teks biasa; pisahkan paragraf dengan satu baris kosong.
- **Agenda:** isi status kegiatan (akan datang/berlangsung/selesai/dibatalkan) dan centang *Tampilkan*. Setelah selesai, buat **Galeri** dan kaitkan ke agenda agar muncul sebagai dokumentasi.
- **Laporan:** tayangkan hanya yang sudah disetujui.
- **Pengurus:** unggah foto hanya dengan izin yang bersangkutan. Jangan menyimpan kontak pribadi.
- Akhir periode kepengurusan: tambahkan pengurus periode baru dengan nilai *Periode* baru (mis. `2026/2027`); halaman publik otomatis memilih periode terbaru dan menyediakan pilihan periode lama.

## Aspirasi
1. Buka Dasbor → **Aspirasi**. Saring status/kategori, atau cari kode tiket (`ASP-…`).
2. Tetapkan **penanggung jawab**, ubah **status**. Mengubah status otomatis menambah riwayat yang terlihat pengirim.
3. **Tanggapan publik** dibaca pengirim lewat kode tiket. Centang *Tampilkan di Aspirasi Publik* hanya bila isinya aman dipublikasikan (judul + isi + tanggapan tampil, tanpa identitas).
4. **Catatan internal** tidak pernah terlihat pengirim maupun publik.
5. Status "Tidak dapat ditindaklanjuti" **wajib** disertai alasan.
6. Kiriman anonim: jangan berupaya melacak identitas pengirim.

## Forum
- Buat **Kategori Forum** dulu. Aturan komunitas ada di `/aturan-komunitas` (dapat diganti di Pengaturan Website).
- Laporan pengguna masuk ke Dasbor → Forum & Moderasi → **Laporan**: *Sembunyikan konten* / *Tandai selesai* / *Abaikan*.
- Di halaman topik, moderator melihat panel: tutup/buka, sematkan, tandai **bahan evaluasi**, sembunyikan.
- Pembatasan spam otomatis: maks. 5 topik dan 20 komentar per jam per pengguna.
- Pelanggaran berulang → Super Admin dapat **memblokir** akun (Pengguna & Role).

## Kemitraan dan sponsor
1. Permohonan masuk dengan nomor `KRJ-…`. Pemohon melacak dengan nomor + email.
2. Ubah status, tulis catatan. **Catatan internal** tidak terlihat pemohon.
3. Bila disetujui dan mitra mengizinkan publikasi, klik **Jadikan sponsor (draf)** → lengkapi logo/deskripsi di tab *Sponsor* → centang *Tampilkan*. Sponsor dari mitra yang **tidak** mengizinkan publikasi tidak dapat ditayangkan (ditolak database).
4. Proposal PDF dibuka lewat tautan sementara (5 menit).

## Donasi dan transparansi — syarat sebelum diaktifkan
Website ini **hanya mencatat dan melaporkan**; tidak ada pembayaran online.
- [ ] Ada kebijakan pengelolaan donasi yang sah dan penanggung jawab keuangan.
- [ ] Kanal/rekening **resmi** telah disetujui pihak berwenang dan diisi di *Pengaturan Website → Informasi donasi resmi* (jangan diisi rekening pribadi atau yang belum disahkan).
- [ ] Alur verifikasi donasi disepakati: donasi dicatat **setelah dana benar-benar diterima**, status *Terverifikasi*.
- [ ] Laporan pertanggungjawaban pertama sudah siap.
Setelah itu: Pengaturan Website → aktifkan halaman donasi. Publik hanya melihat donasi *Terverifikasi* + *Tampil*, dan nama donatur hanya bila donatur mengizinkan; selebihnya "Anonim".

## PMB — syarat sebelum diaktifkan
**Jangan aktifkan tanpa persetujuan resmi kampus.** Website tidak berisi data karangan: semuanya diisi pihak kampus.
- [ ] Surat/persetujuan resmi dari kampus untuk membuka PMB lewat website ini.
- [ ] Data resmi siap: tahun akademik, nama periode/gelombang, tanggal buka-tutup, **program studi resmi**, **persyaratan**, **jadwal**. (Biaya hanya dicantumkan bila kampus menyediakannya, mis. dalam deskripsi periode.)
- [ ] Penanggung jawab data pendaftar ditetapkan; **Petugas PMB** diberi role (bukan sembarang admin).
- [ ] Kebijakan privasi dan retensi data pendaftar disepakati (berapa lama data disimpan, siapa yang boleh ekspor).
- [ ] Uji coba end-to-end dengan data berlabel `[UJI]`, lalu bersihkan (`cleanup_data_uji.sql`; hapus berkas Storage manual).
Aktivasi: isi **Periode** dan **Program studi** (centang Aktif) → Pengaturan Website → aktifkan PMB.

Pengelolaan harian PMB: Dasbor → PMB → **Pendaftar** → buka pendaftar → periksa dokumen → ubah status. Gunakan **catatan untuk pendaftar** untuk meminta perbaikan (status *Perlu perbaikan*; pendaftar dapat mengubah data/dokumen). Setelah *Terverifikasi*, data terkunci bagi pendaftar. Status *Diterima/Tidak diterima* hanya sesuai ketetapan resmi kampus.

**Ekspor CSV:** tercatat di Log Aktivitas, memuat data pribadi → simpan di tempat aman, bagikan hanya ke yang berwenang, hapus bila tidak lagi dibutuhkan.

## Privasi: lakukan dan hindari
- Lakukan: batasi role, pakai kata sandi kuat dan unik, keluar dari akun di komputer bersama, hapus data uji.
- Hindari: menyalin data pendaftar/aspirasi ke grup chat, menayangkan aspirasi yang memuat data pribadi, menyimpan berkas ekspor di folder bersama.
