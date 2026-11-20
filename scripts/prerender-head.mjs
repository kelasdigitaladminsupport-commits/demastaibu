// Dijalankan setelah `vite build`. Membuat salinan dist/index.html per halaman publik dengan <head> khusus halaman itu
// (judul, deskripsi, alamat kanonik, og:/twitter:). Tujuannya: Google langsung melihat identitas tiap halaman di HTML awal,
// bukan baru setelah JavaScript berjalan, sehingga halaman seperti /struktur tidak dianggap duplikat beranda.
// Netlify menyajikan berkas yang ada lebih dulu sebelum aturan SPA, dan aplikasi React tetap mengambil alih seperti biasa.
// Halaman berita/agenda/galeri TIDAK ditangani di sini (sudah punya fungsi `meta`).
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DIST = 'dist'
const SHORT = 'DEMA STAI Bahriyatul Ulum'
const NAME = 'DEMA STAI Bahriyatul Ulum KH. Zainul Arifin Pandan'

// path -> judul (sama dengan useDocumentTitle di tiap halaman) + deskripsi ringkas. noindex: halaman utilitas.
const PAGES = [
  { p: '/profil', t: 'Profil DEMA', d: `Profil ${NAME}: sejarah, peran, dan gambaran organisasi kemahasiswaan.` },
  { p: '/visi-misi', t: 'Visi dan Misi', d: `Visi dan misi ${NAME}.` },
  { p: '/struktur', t: 'Struktur Kepengurusan', d: `Struktur kepengurusan ${NAME}: susunan pengurus beserta jabatannya.` },
  { p: '/bidang', t: 'Bidang dan Anggota', d: `Daftar bidang dan anggota ${NAME}.` },
  { p: '/program-kerja', t: 'Program Kerja', d: `Program kerja ${NAME} beserta statusnya.` },
  { p: '/pengabdian', t: 'Pengabdian kepada Masyarakat', d: `Kegiatan pengabdian kepada masyarakat oleh ${NAME}.` },
  { p: '/laporan', t: 'Laporan dan Evaluasi', d: `Laporan dan evaluasi kegiatan ${NAME}.` },
  { p: '/kontak', t: 'Kontak', d: `Hubungi ${NAME}: alamat, kontak, dan formulir pesan.` },
  { p: '/aspirasi', t: 'Aspirasi, Kritik, dan Saran', d: `Sampaikan aspirasi, kritik, dan saran mahasiswa kepada ${NAME}.` },
  { p: '/forum', t: 'Forum Diskusi', d: `Forum diskusi mahasiswa ${NAME}.` },
  { p: '/rekrutmen', t: 'Pendaftaran Kepengurusan DEMA', d: `Informasi dan persyaratan pendaftaran kepengurusan ${NAME}.` },
  { p: '/kolaborasi', t: 'Kolaborasi dan Sponsorship', d: `Ajukan kolaborasi, kerja sama, atau sponsorship dengan ${NAME}.` },
  { p: '/pmb', t: 'Informasi Calon Mahasiswa Baru', d: `Informasi pendaftaran mahasiswa baru STAI Bahriyatul Ulum KH. Zainul Arifin Pandan.` },
  { p: '/donasi', t: 'Donasi dan Transparansi', d: `Donasi dan laporan transparansi ${NAME}.` },
  { p: '/kebijakan-privasi', t: 'Kebijakan Privasi', d: `Kebijakan privasi website ${NAME}.` },
  { p: '/aturan-komunitas', t: 'Aturan Komunitas', d: `Aturan komunitas untuk forum dan komentar di website ${NAME}.` },
  // Halaman utilitas: jangan diindeks (tetap diberi judul sendiri agar tidak dianggap duplikat beranda)
  { p: '/verifikasi-email', t: 'Verifikasi Email', d: 'Verifikasi email akun.', noindex: true },
  { p: '/kolaborasi/verifikasi', t: 'Verifikasi Email Kolaborasi', d: 'Verifikasi email pengajuan kolaborasi.', noindex: true },
]

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function setMeta(html, attr, key, value, state) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`)
  if (!re.test(html)) { state.missed.push(`${attr}=${key}`); return html }
  return html.replace(re, (_m, a, b) => `${a}${esc(value)}${b}`)
}

async function main() {
  const indexPath = path.join(DIST, 'index.html')
  if (!existsSync(indexPath)) { console.warn('[prerender-head] dist/index.html tidak ditemukan; dilewati.'); return }
  const base = await readFile(indexPath, 'utf8')
  const site = (process.env.VITE_SITE_URL || process.env.URL || '').trim().replace(/\/$/, '')
  if (!site) console.warn('[prerender-head] VITE_SITE_URL/URL kosong: alamat kanonik akan relatif. Isi VITE_SITE_URL dengan domain resmi.')
  const canonRe = /(<link\s+rel="canonical"\s+href=")[^"]*(")/
  let made = 0

  for (const pg of PAGES) {
    const state = { missed: [] }
    const url = `${site}${pg.p}`
    const title = `${pg.t} — ${SHORT}`
    let html = base
    if (!/<title>[^<]*<\/title>/.test(html)) state.missed.push('title')
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    html = setMeta(html, 'name', 'description', pg.d, state)
    html = setMeta(html, 'property', 'og:title', title, state)
    html = setMeta(html, 'property', 'og:description', pg.d, state)
    html = setMeta(html, 'property', 'og:url', url, state)
    html = setMeta(html, 'name', 'twitter:title', title, state)
    html = setMeta(html, 'name', 'twitter:description', pg.d, state)
    if (pg.noindex) html = setMeta(html, 'name', 'robots', 'noindex,nofollow', state)
    if (!canonRe.test(html)) state.missed.push('canonical')
    html = html.replace(canonRe, (_m, a, b) => `${a}${esc(url)}${b}`)

    if (state.missed.length) { console.warn(`[prerender-head] ${pg.p}: tag tidak ditemukan (${state.missed.join(', ')}); dilewati agar tidak merusak halaman.`); continue }
    const dir = path.join(DIST, ...pg.p.split('/').filter(Boolean))
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'index.html'), html)
    made++
  }
  console.log(`[prerender-head] ${made}/${PAGES.length} halaman diberi <head> khusus.`)
}

// Kegagalan skrip ini tidak boleh menggagalkan deploy: halaman tetap berfungsi lewat SPA biasa.
main().catch((e) => { console.warn('[prerender-head] dilewati karena galat:', e?.message ?? e) })
