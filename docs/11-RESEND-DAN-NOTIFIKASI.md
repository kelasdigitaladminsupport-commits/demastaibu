# 11. Email lewat Resend, perbaikan reset kata sandi, dan notifikasi ke staf

## A. SMTP Resend untuk email Supabase (verifikasi & reset kata sandi)
Email verifikasi/reset dibuat oleh Supabase Auth, jadi pengirimannya diarahkan ke Resend lewat SMTP (bukan layanan email bawaan Supabase):
1. Resend → **Domains** → tambahkan domain Anda, pasang DNS (SPF/DKIM) sampai **Verified**. **API Keys** → buat kunci.
2. Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password = **API key Resend**
   - Sender email: alamat di domain terverifikasi (mis. `noreply@domain-anda.id`), Sender name: `DEMA STAI BU`
3. Resend → **Domains → (domain) → matikan _Click tracking_ dan _Open tracking_.** Pelacakan klik menulis ulang tautan di email sehingga token reset kata sandi rusak.

## B. Reset kata sandi tidak menampilkan formulir
Penyebab umum, periksa berurutan:
1. **Supabase → Authentication → URL Configuration**: *Redirect URLs* harus memuat `https://SITUS-ANDA.netlify.app/**` (dan `http://localhost:5173/**`). Bila tidak, Supabase mengarahkan tautan ke beranda. (Kode sekarang tetap membawa Anda ke `/reset-password` bila itu terjadi.)
2. Click tracking Resend masih aktif (langkah A.3).
3. Tautan sudah dipakai/kedaluwarsa. Pemindai email kadang membuka tautan lebih dulu. Minta tautan baru dan buka langsung.
4. Template email (Authentication → Emails → Reset Password) harus memakai `{{ .ConfirmationURL }}`.

## C. Notifikasi email ke staf (aspirasi, kontak, kemitraan, PMB, pendaftar pengurus)
Siapa yang diberi tahu (otomatis dari role, akun yang diblokir dilewati):
| Kejadian | Penerima |
|---|---|
| Aspirasi baru | Super Admin, Admin, Moderator |
| Pesan kontak baru | Super Admin, Admin |
| Permohonan kemitraan | Super Admin, Admin |
| Pendaftar PMB | Super Admin, Admin, Petugas PMB |
| Pendaftar pengurus | Super Admin, Admin |

Email hanya berisi jenis, nomor referensi, dan tombol ke dasbor (tanpa data pribadi). Email dikirim ke alamat akun masing-masing staf.

**Pemasangan (sekali):**
1. Netlify → Environment variables (jangan berawalan `VITE_`):
   - `RESEND_API_KEY` = API key Resend (disarankan kunci khusus "Sending access")
   - `RESEND_FROM_EMAIL` = `DEMA STAI BU <notifikasi@domain-anda.id>`
   - `NOTIFY_WEBHOOK_SECRET` = teks acak panjang buatan Anda
   Lalu **deploy ulang**.
2. Supabase → SQL Editor: jalankan `supabase/migrations/0014_staff_email_notifications.sql`, lalu:
   ```sql
   insert into private.notify_config (url, secret)
   values ('https://SITUS-ANDA.netlify.app/.netlify/functions/notify', 'ISI-SAMA-DENGAN-NOTIFY_WEBHOOK_SECRET')
   on conflict (id) do update set url = excluded.url, secret = excluded.secret;
   ```
3. Uji: kirim pesan lewat halaman Kontak; staf harus menerima email. Bila tidak: Netlify → Functions → `notify` → log; Supabase → Logs → Postgres.

Catatan: staf yang tidak ingin menerima email cukup dicabut role-nya dari modul terkait. Resend paket gratis dibatasi jumlah email per hari/bulan; periksa kuota akun Anda.

## D. Notifikasi dasbor (lonceng) dan email konfirmasi ke pengirim formulir (migrasi 0016)
Jalankan `supabase/migrations/0016_notifications_and_confirmations.sql` setelah 0014 (tanpa konfigurasi tambahan).

**1. Lonceng notifikasi di dasbor admin.** Setiap kejadian pada tabel C di atas juga menambah notifikasi untuk Super Admin/Admin (dan peran terkait) di ikon lonceng pojok kanan atas dasbor. Isinya hanya jenis + nomor referensi; klik untuk membuka modulnya. Lonceng ini bekerja **meskipun Resend belum dikonfigurasi**, dan diperbarui otomatis tiap 1 menit.

**2. Email konfirmasi otomatis ke pengirim.** Setelah formulir terkirim, alamat email yang diisi pengguna menerima konfirmasi:
| Formulir | Isi email |
|---|---|
| Pendaftaran Mahasiswa Baru | nama, nomor pendaftaran, tombol ke halaman cek status |
| Pendaftaran pengurus DEMA | nama, nomor pendaftaran, tombol ke halaman pendaftaran |
| Kolaborasi / kerja sama | nama kontak, nomor referensi, tombol ke halaman kolaborasi |

Catatan keamanan: **Kode Pelacakan PMB sengaja tidak dikirim lewat email** (database hanya menyimpan hash-nya dan menampilkannya sekali di layar). Email konfirmasi memakai fungsi, rahasia, dan variabel Netlify yang sama dengan bagian C, jadi tidak ada pemasangan baru; **deploy ulang situs** agar fungsi `notify` versi baru aktif. Uji: kirim satu formulir dengan email Anda sendiri.

## E. Verifikasi email (migrasi 0017)
Jalankan `supabase/migrations/0017_email_verification.sql` setelah 0016, lalu **deploy ulang** situs (fungsi `notify` dan halaman baru).

| Formulir | Alur |
|---|---|
| Kolaborasi / kerja sama (tanpa login) | Formulir terkirim → email **verifikasi** berisi tombol (berlaku 3 hari, sekali pakai) → pemilik email menekan **Verifikasi email saya** di `/kolaborasi/verifikasi` → barulah email **konfirmasi** dikirim. |
| PMB dan pendaftaran pengurus (wajib login) | Konfirmasi dikirim ke **email akun yang sudah terverifikasi** Supabase Auth, bukan ke isian bebas di formulir. Akun yang emailnya belum dikonfirmasi tidak dikirimi apa pun. |

Catatan:
- Verifikasi baru terjadi saat tombol ditekan, bukan saat tautan dibuka, sehingga pemindai email tidak menghabiskan tautan.
- Di dasbor admin (Kolaborasi), email pengaju diberi lencana **Terverifikasi / Belum terverifikasi**. Pengajuan yang belum terverifikasi tetap masuk ke daftar dan staf tetap diberi notifikasi; hanya saja alamat emailnya belum terbukti milik pengaju.
- Penting: Supabase Auth harus mewajibkan konfirmasi email (Authentication → Providers → Email → *Confirm email* aktif), agar email akun PMB/pengurus benar-benar terverifikasi.
- Bila `private.notify_config` belum diisi, tidak ada email verifikasi/konfirmasi yang dikirim.

## F. Email otomatis saat status berubah (migrasi 0021)
Jalankan `supabase/migrations/0021_status_change_emails.sql` (setelah 0014, 0017, dan 0020), lalu **deploy ulang** situs agar fungsi `notify` versi baru aktif. Tidak ada variabel atau konfigurasi baru: memakai Resend dan `private.notify_config` yang sama.

Setiap kali Super Admin/Admin/petugas mengubah status, pengaju otomatis menerima email formal berisi status terbaru, nomor referensi, catatan dari pengurus (bila diisi), dan tautan ke halaman terkait. Email memuat pesan agar tidak dibalas karena dikirim otomatis.

| Pengajuan | Status yang memicu email | Dikirim ke |
|---|---|---|
| PMB | Sedang diverifikasi, Perlu perbaikan, Terverifikasi, Diterima, Tidak diterima, Mengundurkan diri | Email akun yang sudah terkonfirmasi |
| Pendaftaran pengurus | Sedang ditinjau, Tahap wawancara, Diterima, Tidak diterima, Mengundurkan diri | Email akun yang sudah terkonfirmasi |
| Kolaborasi / sponsorship | Ditinjau, Dalam pembahasan, Disetujui, Tidak dilanjutkan, Selesai | Email di formulir, **hanya bila sudah terverifikasi** (bagian E) |
| Aspirasi | Ditinjau, Butuh info, Dibahas, Ditindaklanjuti, Selesai, Belum dapat ditindaklanjuti | Email akun, hanya aspirasi **non-anonim** |

Catatan:
- Status awal (Terkirim/Diterima pada kolaborasi) tidak memicu email karena konfirmasi pengiriman sudah ada.
- Catatan untuk pendaftar PMB diambil dari kolom *Catatan untuk pendaftar* pada form ubah status; untuk pengurus dari *note_public*; untuk aspirasi dari *tanggapan publik*.
- Mengubah teks email: edit objek `STATUS_MAIL` di `netlify/functions/notify.mjs`, lalu deploy ulang.
- Kolaborasi yang emailnya belum terverifikasi tidak dikirimi email status (mencegah email ke alamat orang lain). Status tetap dapat dilacak di halaman kolaborasi.
- Uji: ubah status satu pendaftaran uji milik akun Anda sendiri, lalu periksa kotak masuk dan Netlify → Functions → `notify`.

## G. Verifikasi email dengan kode OTP di formulir kolaborasi (migrasi 0022)
Jalankan `supabase/migrations/0022_partnership_email_otp.sql` (setelah 0017 dan 0021), lalu **deploy ulang** situs (fungsi `notify` dan halaman baru). Tanpa konfigurasi tambahan: memakai Resend dan `private.notify_config` yang sama. **Wajib terisi**; bila belum, tombol verifikasi menampilkan "Layanan pengiriman kode belum tersedia".

Alur di halaman Kolaborasi & Sponsorship:
1. Pengaju mengisi email lalu menekan **Verifikasi email** (di bawah kolom email).
2. Kode 6 digit dikirim ke email itu (berlaku **10 menit**, kirim ulang setelah 60 detik).
3. Kode dimasukkan langsung di formulir. Bila benar, tampil **Email terverifikasi** dan kolom email terkunci (ada tombol *Ganti email*).
4. Tombol **Kirim permohonan** baru diterima server bila email sudah terverifikasi; email konfirmasi langsung dikirim.

Keamanan:
- Verifikasi **wajib** dan ditegakkan di database: `submit_partnership` menolak pengajuan tanpa bukti verifikasi yang cocok dengan email (bukti berlaku 30 menit dan sekali pakai).
- Kode dan bukti hanya disimpan sebagai hash di skema `private`. Maksimal 5 tebakan per kode, 5 kode per jam per email, jeda 60 detik, plus pembatasan per klien.
- Semua pengajuan baru otomatis berstatus email terverifikasi, sehingga email status (bagian F) selalu terkirim.
- Tautan verifikasi lama (migrasi 0017) tetap berfungsi untuk pengajuan yang sudah terkirim sebelum fitur ini.
- Uji: buka `/kolaborasi`, isi email Anda, tekan *Verifikasi email*, masukkan kode, lalu kirim formulir. Coba juga kode salah dan kirim ulang kode.

## H. Email konfirmasi otomatis saat formulir dikirim (migrasi 0023)
Jalankan `supabase/migrations/0023_submission_confirmation_emails.sql` (setelah 0017 dan 0021), lalu **deploy ulang** situs agar teks email baru aktif. Tanpa konfigurasi tambahan.

Setiap kali formulir terkirim, pengaju menerima email ucapan terima kasih yang formal berisi nomor referensi dan tautan ke halaman terkait. Email memuat pesan agar tidak dibalas.

| Formulir | Dikirim ke | Keterangan |
|---|---|---|
| PMB | Email akun terkonfirmasi | Kode Pelacakan tidak dikirim lewat email (alasan keamanan) |
| Pendaftaran pengurus | Email akun terkonfirmasi | |
| Kolaborasi / sponsorship | Email di formulir (sudah diverifikasi OTP) | Dikirim oleh `submit_partnership` |
| Aspirasi | Email akun, hanya aspirasi **non-anonim** | Aspirasi anonim tidak dikirimi email |
| Pesan Kontak | tidak dikirim | Formulir tanpa login dan emailnya belum terverifikasi; mengirim ke sana dapat disalahgunakan |

- Mengubah kata-kata: edit objek `FORMS` di `netlify/functions/notify.mjs`, lalu deploy ulang.
- Cek tidak ada trigger ganda (harus satu per tabel):
  `select tgrelid::regclass, tgname from pg_trigger where tgname = 'notify_submitter';`
