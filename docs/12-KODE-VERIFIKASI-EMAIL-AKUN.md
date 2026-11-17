# 12 — Kode verifikasi email saat mendaftar akun

Alur baru: **Daftar → email berisi kode angka → masukkan kode di website → otomatis masuk.**
Pengguna lama yang emailnya belum terverifikasi: saat masuk, mereka diarahkan ke `/verifikasi-email`
dan kode baru dikirim otomatis.

Kode TIDAK dibuat oleh website, melainkan oleh Supabase Auth dan dikirim lewat SMTP yang sudah
Anda atur di Supabase. Agar yang terkirim berupa **kode** (bukan tautan), template email di Supabase
harus diubah sekali, seperti di bawah.

## 1. Ubah template email "Confirm signup" (wajib)
Supabase Dashboard → **Authentication** → **Emails** (atau *Email Templates*) → template **Confirm signup**.

**Subject:** `Kode verifikasi email DEMA STAI Bahriyatul Ulum`

**Body (HTML):**
```html
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px">
  <h2 style="color:#064e3b">Verifikasi email Anda</h2>
  <p>Assalamu’alaikum. Masukkan kode berikut di halaman pendaftaran website DEMA STAI Bahriyatul Ulum:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">{{ .Token }}</p>
  <p>Kode berlaku sementara dan hanya untuk Anda. Jangan bagikan kode ini kepada siapa pun.</p>
  <p style="color:#64748b;font-size:12px">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
</div>
```
Bagian terpenting adalah `{{ .Token }}`. Jangan menambahkan `{{ .ConfirmationURL }}` bila ingin alur
kode saja (tautan di email bisa "terpakai" lebih dulu oleh pemindai email).

## 2. Cek pengaturan Auth
- **Confirm email** harus **aktif** (Authentication → Sign In / Providers → Email). Bila nonaktif,
  pengguna langsung masuk tanpa kode.
- **Panjang kode (OTP length)**: bawaan 6 digit. Website menerima 6–10 digit, jadi bebas diubah.
- **Masa berlaku kode**: bawaan 1 jam. Bisa dipersingkat (mis. 10–15 menit) di pengaturan yang sama.
- Batas pengiriman email Auth (Authentication → Rate Limits) berlaku per jam; naikkan bila mendaftar ramai.

## 3. Uji
1. Buka `/daftar`, daftar dengan email yang bisa dibuka.
2. Email berisi kode 6 digit masuk → masukkan di halaman → otomatis masuk dan kembali ke beranda.
3. Uji "Kirim ulang kode" (jeda 60 detik) dan kode salah (muncul pesan, bisa coba lagi).
4. Uji akun lama yang belum terverifikasi: coba masuk → diarahkan ke `/verifikasi-email`.

## Catatan
- Kode yang benar langsung membuat sesi masuk, dan menandai email akun sebagai terverifikasi
  (dipakai juga oleh email konfirmasi PMB/pengurus, migrasi 0017).
- Daftar dengan email yang SUDAH terdaftar tidak membocorkan keberadaan akun: Supabase mengembalikan
  respons yang sama, sehingga kode tidak akan datang. Pengguna diarahkan memakai "Lupa kata sandi".
- Tidak ada perubahan database untuk fitur ini.
