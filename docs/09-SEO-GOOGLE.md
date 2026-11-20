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

## Pratinjau tautan (WhatsApp/Facebook) menampilkan gambar & judul berita
Berlaku untuk **berita, agenda, dan galeri**. Gambar sampul dikecilkan otomatis ke 1200×630 JPEG lewat Netlify Image CDN (aturan `[images]` di `netlify.toml`), karena WhatsApp sering mengabaikan gambar besar. Matikan dengan variabel Netlify `OG_IMAGE_RESIZE=off`.

Bila yang tampil masih kartu bawaan (huruf "D"):
1. **Cache WhatsApp.** WhatsApp menyimpan pratinjau tautan yang pernah dikirim. Uji dengan tautan baru: tambahkan `?v=2` di akhir (mis. `.../berita/judul?v=2`), atau pakai Facebook Sharing Debugger → *Scrape Again*.
2. Berita harus berstatus **Terbit**, waktu tayang sudah lewat, dan **gambar sampul sudah diunggah**.
3. Variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` harus tersedia untuk **Functions** (Netlify → Environment variables → Scopes: *All*), lalu deploy ulang.
4. Buka `https://SITUS/berita/SLUG` → View page source → cari `og:image`. Bila isinya `og-default.png`, fungsi `meta` belum mendapat data (lihat poin 2–3 dan Netlify → Functions → `meta` → log).
5. Halaman lain (beranda, profil, dll.) memakai kartu bawaan; ganti `public/og-default.png` dengan desain resmi 1200×630.

## Memastikan SEMUA halaman dan postingan terindeks
Yang otomatis masuk `sitemap.xml`: halaman utama, semua halaman tetap (profil, visi-misi, struktur, bidang, program kerja,
galeri, laporan, kontak, aspirasi, forum, rekrutmen, kolaborasi, dll.), serta **setiap berita, agenda, dan galeri berstatus tayang**.
Konten baru masuk sendiri (sitemap di-cache 1 jam). Topik forum buatan pengguna sengaja tidak dimasukkan.

Agar Google cepat dan tepat mengindeks:
1. **Kirim sitemap** di Search Console pada properti domain resmi (`https://DOMAIN-ANDA/sitemap.xml`) sampai berstatus *Success*.
2. **Minta pengindeksan** (URL Inspection -> Request indexing) untuk halaman penting: `/struktur`, `/profil`, `/berita`, `/agenda`,
   dan tiap berita penting yang baru terbit. Ada kuota harian (sekitar belasan URL), jadi prioritaskan.
3. **Setiap postingan**: status *Terbit*, judul jelas, **ringkasan terisi** (menjadi deskripsi di Google), dan gambar sampul.
4. **Halaman tetap memiliki `<head>` sendiri sejak HTML awal.** Skrip `scripts/prerender-head.mjs` (dijalankan otomatis saat
   `npm run build`) membuat judul, deskripsi, dan alamat kanonik per halaman, sehingga `/struktur` tidak dianggap duplikat beranda.
   Pastikan `VITE_SITE_URL` berisi domain resmi saat build. Uji: buka `/struktur` -> View page source -> `<title>` dan
   `rel="canonical"` harus menyebut Struktur Kepengurusan / alamat `/struktur`.
5. **Pantau**: Search Console -> *Pages*; cari `site:DOMAIN-ANDA` di Google. Status *Discovered/Crawled - currently not indexed*
   pada situs baru itu wajar; tambah konten rutin dan dapatkan tautan masuk (situs kampus, bio Instagram, dll.).
6. Halaman utilitas (`/verifikasi-email`, `/kolaborasi/verifikasi`, `/rekrutmen/daftar`, login, admin, dll.) ditandai `noindex`.
