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
| Pendaftar PMB | Super Admin, Petugas PMB |
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
