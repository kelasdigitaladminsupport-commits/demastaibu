# 9. Agar website muncul di Google, pratinjau tautan, dan fitur terkait

## Yang sudah disiapkan oleh kode
| Hal | Cara kerjanya |
|---|---|
| Judul, deskripsi, bahasa, `og:` dan Twitter Card | Ada di HTML awal (dibaca mesin pencari dan aplikasi chat **tanpa** menjalankan JavaScript) |
| Judul + deskripsi **per halaman** | Diperbarui otomatis saat berpindah halaman |
| Detail **berita** dan **agenda** | Fungsi Netlify `meta` menyisipkan judul, ringkasan, gambar sampul, alamat kanonik, dan data terstruktur (`NewsArticle`/`Event`) langsung ke HTML. Jadi tautan berita yang dibagikan ke WhatsApp/Facebook menampilkan **judul dan gambar beritanya**, bukan tampilan beranda |
| `sitemap.xml` | Dibuat otomatis saat diminta (bukan saat build): memuat halaman utama + semua berita, agenda, dan galeri yang **sudah tayang**. Berita baru masuk tanpa perlu deploy ulang |
| `robots.txt` | Mengizinkan situs publik; melarang `/admin`, `/masuk`, `/daftar`, area PMB privat, dll.; menunjuk ke sitemap |
| `noindex` | Halaman privat (admin, login, pendaftaran dan bukti PMB, buat topik) ditandai agar tidak diindeks |
| Data terstruktur organisasi | Nama resmi, logo (dari Pengaturan Website), dan akun media sosial resmi dikirim ke Google (`Organization` + `WebSite`) |
| Ikon tab (favicon) | Otomatis memakai logo dari Pengaturan Website |
| Verifikasi Google Search Console | Kode dipasang otomatis dari variabel lingkungan (langkah 2 di bawah) |

## ⚠️ Yang TIDAK dapat dijanjikan (jujur)
- **Tidak ada cara menjamin** website langsung muncul di Google atau berada di peringkat teratas. Google yang memutuskan kapan mengindeks (biasanya beberapa hari sampai beberapa minggu untuk situs baru) dan peringkatnya.
- Mencari **nama organisasi** akan menampilkan situs ini hanya setelah diindeks, dan bersaing dengan situs/akun lain yang menyebut nama serupa (situs kampus, Instagram, dll.). Peringkat naik bila situs lain yang tepercaya menautkan ke situs ini.
- Hati-hati terhadap pihak yang menjual "jasa jaminan peringkat 1 Google".
- Alamat `*.netlify.app` boleh diindeks, tetapi domain sendiri biasanya lebih meyakinkan. Opsi terbaik: **subdomain resmi kampus** (mis. `dema.domainkampus.ac.id`) — minta pihak kampus mengarahkannya.

## Langkah-langkah (urut)

### 1. Deploy dan pastikan berkas SEO aktif
Setelah deploy (docs/02), buka di peramban:
- `https://ALAMAT-ANDA/robots.txt` → harus berisi `Sitemap: https://ALAMAT-ANDA/sitemap.xml`
- `https://ALAMAT-ANDA/sitemap.xml` → daftar alamat (XML). Berita yang sudah **Terbit** harus ada di sana.
- Buka sebuah berita, klik kanan → *View page source* → cari `og:title`: harus berisi judul **berita itu**.
Bila `sitemap.xml` kosong atau galat, periksa Netlify → **Functions** (fungsi `sitemap`, `robots`, `meta` harus terdaftar) dan variabel `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`.

### 2. Daftarkan di Google Search Console (gratis)
1. Buka search.google.com/search-console → **Add property** → pilih **URL prefix** → isi alamat situs lengkap (`https://…`).
2. Pilih metode verifikasi **HTML tag**. Google menampilkan tag seperti `<meta name="google-site-verification" content="KODE">`. Salin **hanya KODE-nya**.
3. Netlify → **Site configuration → Environment variables** → tambah `VITE_GOOGLE_SITE_VERIFICATION` = KODE → **deploy ulang** (variabel hanya terbaca saat build).
4. Kembali ke Search Console → **Verify**.
(Bila memakai domain sendiri, boleh memakai properti **Domain** dengan verifikasi DNS TXT — tidak perlu langkah 3.)

### 3. Kirim sitemap dan minta pengindeksan
1. Search Console → **Sitemaps** → ketik `sitemap.xml` → **Submit**. Status harus "Success".
2. **URL Inspection** → tempel alamat beranda → **Request indexing**. Ulangi untuk beberapa halaman utama (`/berita`, `/profil`, `/agenda`).
3. Cek menu **Pages** (Indexing) berkala. Status "Discovered/Crawled – currently not indexed" pada situs baru itu umum; tunggu dan terus tambah konten.

### 4. Domain sendiri (bila ada)
Atur domain di Netlify (docs/02-F), isi `VITE_SITE_URL=https://domain-anda` di Netlify, deploy ulang, lalu daftarkan domain itu di Search Console. Ulangi pembaruan URL di Supabase Auth.

### 5. Hal yang mempercepat dan menguatkan
- **Tautan masuk dari situs resmi kampus** ke website DEMA — faktor terpenting.
- Cantumkan alamat website di bio Instagram/TikTok/YouTube resmi (dan isi tautan media sosial di Pengaturan Website agar Google mengenali akun resminya).
- Terbitkan berita/agenda secara rutin dengan **judul jelas** dan **ringkasan** terisi (ringkasan dipakai sebagai deskripsi hasil pencarian). Unggah gambar sampul.
- Pakai nama resmi yang konsisten.
- Beritahu mahasiswa untuk membagikan tautan website.

## Pratinjau saat tautan dibagikan
- Beranda dan halaman umum memakai gambar `public/og-default.png` (1200×630). **Ganti dengan desain resmi organisasi** (nama berkas sama) lalu deploy.
- Berita/agenda memakai gambar sampul masing-masing; bila tidak ada, memakai gambar bawaan di atas.
- WhatsApp, Facebook, dan lainnya **menyimpan (cache) pratinjau lama**. Setelah mengubah judul/gambar, uji ulang dengan Facebook Sharing Debugger (developers.facebook.com/tools/debug) agar cache diperbarui; di WhatsApp, tambahkan parameter pada tautan (mis. `?v=2`) untuk memaksa pratinjau baru.
- Uji hasil data terstruktur: Google **Rich Results Test** (search.google.com/test/rich-results) dengan alamat sebuah berita.

## Biaya dan kinerja
Fungsi Netlify dipakai untuk `meta`, `sitemap`, dan `robots`. Hasilnya disimpan di CDN (halaman berita 15 menit; sitemap/robots 1 jam), sehingga fungsi tidak dipanggil pada setiap kunjungan. Pada akun Netlify berbasis kredit, penggunaan fungsi ikut dihitung — pantau di dashboard. Untuk menonaktifkan penyisipan metadata per halaman, hapus dua aturan redirect `/berita/*` dan `/agenda/*` di `netlify.toml` (situs tetap berfungsi; hanya pratinjau tautan berita kembali umum).

## Keterbatasan teknis
- Aplikasi ini memuat isi halaman lewat JavaScript. Google dapat menjalankannya, tetapi lebih lambat daripada HTML biasa. Metadata penting (judul, deskripsi, gambar, data terstruktur) sudah ada di HTML untuk berita/agenda; **isi teks lengkap** tetap dibaca setelah JavaScript dijalankan.
- Halaman lain (mis. Profil, Program Kerja) memakai metadata umum situs di HTML awal, lalu diperbarui oleh aplikasi. Pratinjau tautan untuk halaman-halaman itu menampilkan judul/deskripsi umum.
- Jika kelak kecepatan indeks menjadi masalah, solusi lanjutan adalah *prerendering* (membuat HTML statis per halaman) — butuh pekerjaan tambahan.
