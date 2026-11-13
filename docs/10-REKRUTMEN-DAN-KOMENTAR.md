# 10. Pendaftaran Pengurus, Komentar Berita, dan Bingkai Gambar

## A. Jalankan migrasi baru
Supabase → SQL Editor → tempel isi `supabase/migrations/0013_recruitment_news_engagement.sql` → Run (sekali saja, setelah 0001–0012).

## B. Mengisi pendaftaran pengurus (Dasbor → Rekrutmen Pengurus → Periode & Persyaratan)
1. **Tambah** periode: tahun kepengurusan, nama, tanggal buka–tutup.
2. **Persyaratan**: salin dari PDF Pedoman Kemahasiswaan, **satu syarat per baris**. Penomoran di awal baris dibuang otomatis. Pendaftar mencentang tiap syarat sebelum bisa mengirim.
3. **PDF Pedoman**: unggah PDF (maks. 10 MB). Tampil sebagai pratinjau di halaman `/rekrutmen` beserta tombol Buka/Unduh.
4. Centang **Aktif**. Halaman publik: `/rekrutmen` (info) dan `/rekrutmen/daftar` (formulir, wajib login).
5. Pendaftar dikelola di tab **Pendaftar**: ubah status, beri catatan, ekspor CSV (tercatat di Log Aktivitas). Hanya Admin/Super Admin.

## C. Komentar & like berita
Otomatis tampil di setiap detail berita. Wajib login. Balasan satu tingkat, ubah/hapus komentar sendiri, batas 20 komentar/jam. Moderator/Admin dapat menyembunyikan atau menghapus komentar.

## D. Bingkai gambar
Poster agenda, sampul berita, dan foto galeri memakai bingkai yang **mengikuti proporsi gambar** (potret/lanskap/persegi), tanpa dipotong. Galeri tampil dalam susunan masonry.

## E. Build Netlify
`netlify.toml` kini mengecualikan variabel `VITE_*` dari pemindai rahasia Netlify (penyebab umum deploy gagal "Secrets scanning found secrets"). Pastikan hanya kunci **publishable** yang diisi.
