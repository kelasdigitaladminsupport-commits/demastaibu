import { StatusBadge } from '../../components/ui/StatusBadge'
import { GalleryPhotos } from './GalleryPhotos'
import { formatDate, formatDateTime, formatRupiah } from '../../utils/format'
import { ROLES_ADMIN, ROLES_EDITOR, ROLES_MODERATOR, ROLES_PMB_MANAGER } from '../../utils/roles'
import type { ResourceConfig, Row } from './types'

const str = (v: unknown) => (v == null ? '' : String(v))
const title = (row: Row, extra?: string) => (
  <div>
    <p className="font-medium text-slate-900">{str(row.title ?? row.name ?? row.full_name)}</p>
    {extra && <p className="text-xs text-slate-500">{extra}</p>}
  </div>
)
const published = (v: unknown) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${v ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
    {v ? 'Tayang' : 'Draf'}
  </span>
)
const rel = (v: unknown, key = 'name') => {
  const o = (Array.isArray(v) ? v[0] : v) as Record<string, string> | null | undefined
  return o?.[key] ?? '—'
}

const PROGRESS_STATUS = [
  { value: 'planned', label: 'Direncanakan' }, { value: 'ongoing', label: 'Berlangsung' },
  { value: 'done', label: 'Selesai' }, { value: 'cancelled', label: 'Dibatalkan' },
]

export const RESOURCES: Record<string, ResourceConfig> = {
  'kategori-berita': {
    table: 'news_categories', title: 'Kategori Berita', singular: 'Kategori', roles: ROLES_EDITOR,
    select: 'id, name, slug', searchField: 'name', orderBy: { column: 'name', ascending: true },
    publicKeys: ['news-categories', 'news'],
    columns: [{ header: 'Nama', cell: (r) => title(r) }, { header: 'Slug', cell: (r) => <code className="text-xs">{str(r.slug)}</code> }],
    fields: [
      { type: 'text', name: 'name', label: 'Nama kategori', required: true, max: 80 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'name', required: true },
    ],
  },

  berita: {
    table: 'news', title: 'Berita', singular: 'Berita', roles: ROLES_EDITOR,
    select: 'id, title, slug, status, published_at, created_at, category:news_categories(name)',
    searchField: 'title', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['news'],
    columns: [
      { header: 'Judul', cell: (r) => title(r, str(r.slug)) },
      { header: 'Kategori', cell: (r) => rel(r.category) },
      { header: 'Status', cell: (r) => <StatusBadge status={str(r.status) === 'published' ? 'done' : 'planned'} /> },
      { header: 'Tayang', cell: (r) => (r.published_at ? formatDateTime(str(r.published_at)) : '—') },
    ],
    defaults: { status: 'draft' },
    onCreate: ({ userId }) => ({ author_id: userId }),
    fields: [
      { type: 'text', name: 'title', label: 'Judul', required: true, max: 200 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'title', required: true },
      { type: 'relation', name: 'category_id', label: 'Kategori', table: 'news_categories', labelField: 'name' },
      { type: 'text', name: 'author_name', label: 'Nama penulis', max: 120 },
      { type: 'image', name: 'cover_path', label: 'Gambar sampul', bucket: 'public-media', folder: 'news' },
      { type: 'textarea', name: 'excerpt', label: 'Ringkasan', max: 400, rows: 3 },
      { type: 'textarea', name: 'content', label: 'Isi berita', rows: 14, hint: 'Pisahkan paragraf dengan satu baris kosong. Tag HTML tidak ditampilkan.' },
      { type: 'select', name: 'status', label: 'Status', required: true, options: [{ value: 'draft', label: 'Draf (belum tayang)' }, { value: 'published', label: 'Terbit' }] },
      { type: 'datetime', name: 'published_at', label: 'Waktu tayang', hint: 'Kosongkan untuk tayang sekarang. Isi waktu mendatang untuk menjadwalkan.' },
    ],
  },

  agenda: {
    table: 'events', title: 'Agenda', singular: 'Agenda', roles: ROLES_EDITOR,
    select: 'id, title, slug, event_date, location, status, is_published',
    searchField: 'title', orderBy: { column: 'event_date', ascending: false },
    publicKeys: ['events', 'event-galleries'],
    columns: [
      { header: 'Kegiatan', cell: (r) => title(r, str(r.location)) },
      { header: 'Waktu', cell: (r) => formatDateTime(str(r.event_date)) },
      { header: 'Status', cell: (r) => <StatusBadge status={str(r.status)} /> },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { status: 'upcoming' },
    onCreate: ({ userId }) => ({ created_by: userId }),
    validate: (p) => (p.end_date && p.event_date && String(p.end_date) < String(p.event_date) ? 'Waktu selesai tidak boleh lebih awal dari waktu mulai.' : null),
    fields: [
      { type: 'text', name: 'title', label: 'Nama kegiatan', required: true, max: 200 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'title', required: true },
      { type: 'datetime', name: 'event_date', label: 'Waktu mulai', required: true },
      { type: 'datetime', name: 'end_date', label: 'Waktu selesai' },
      { type: 'text', name: 'location', label: 'Lokasi', max: 200 },
      { type: 'image', name: 'poster_path', label: 'Poster', bucket: 'public-media', folder: 'events' },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 8 },
      { type: 'select', name: 'status', label: 'Status kegiatan', required: true, options: [
        { value: 'upcoming', label: 'Akan datang' }, { value: 'ongoing', label: 'Berlangsung' },
        { value: 'done', label: 'Selesai' }, { value: 'cancelled', label: 'Dibatalkan' }] },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di website', hint: 'Jika tidak dicentang, agenda hanya terlihat oleh pengelola.' },
    ],
  },

  program: {
    table: 'programs', title: 'Program Kerja', singular: 'Program', roles: ROLES_EDITOR,
    select: 'id, title, slug, status, start_date, end_date, is_published, department:departments(name)',
    searchField: 'title', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['programs'],
    columns: [
      { header: 'Program', cell: (r) => title(r) },
      { header: 'Bidang', cell: (r) => rel(r.department) },
      { header: 'Status', cell: (r) => <StatusBadge status={str(r.status)} /> },
      { header: 'Periode', cell: (r) => (r.start_date ? formatDate(str(r.start_date)) : '—') },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { status: 'planned' },
    validate: (p) => (p.end_date && p.start_date && String(p.end_date) < String(p.start_date) ? 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.' : null),
    fields: [
      { type: 'text', name: 'title', label: 'Nama program', required: true, max: 200 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'title', required: true },
      { type: 'relation', name: 'department_id', label: 'Bidang', table: 'departments', labelField: 'name' },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 6 },
      { type: 'select', name: 'status', label: 'Status', required: true, options: PROGRESS_STATUS },
      { type: 'date', name: 'start_date', label: 'Tanggal mulai' },
      { type: 'date', name: 'end_date', label: 'Tanggal selesai' },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di website' },
    ],
  },

  galeri: {
    table: 'galleries', title: 'Galeri', singular: 'Galeri', roles: ROLES_EDITOR,
    select: 'id, title, description, cover_path, is_published, created_at',
    searchField: 'title', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['galleries', 'gallery', 'event-galleries'],
    columns: [
      { header: 'Galeri', cell: (r) => title(r) },
      { header: 'Dibuat', cell: (r) => formatDate(str(r.created_at)) },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    fields: [
      { type: 'text', name: 'title', label: 'Judul galeri', required: true, max: 200 },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 3 },
      { type: 'relation', name: 'event_id', label: 'Terkait agenda', table: 'events', labelField: 'title', hint: 'Opsional. Galeri akan muncul sebagai dokumentasi pada halaman agenda tersebut.' },
      { type: 'image', name: 'cover_path', label: 'Sampul', bucket: 'public-media', folder: 'galleries' },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di website' },
    ],
    extraAction: { label: 'Foto', render: (row) => <GalleryPhotos gallery={row} /> },
  },

  pengabdian: {
    table: 'community_programs', title: 'Pengabdian Masyarakat', singular: 'Kegiatan', roles: ROLES_EDITOR,
    select: 'id, title, slug, location, activity_date, status, is_published',
    searchField: 'title', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['community'],
    columns: [
      { header: 'Kegiatan', cell: (r) => title(r, str(r.location)) },
      { header: 'Tanggal', cell: (r) => (r.activity_date ? formatDate(str(r.activity_date)) : '—') },
      { header: 'Status', cell: (r) => <StatusBadge status={str(r.status)} /> },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { status: 'planned' },
    fields: [
      { type: 'text', name: 'title', label: 'Nama kegiatan', required: true, max: 200 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'title', required: true },
      { type: 'text', name: 'location', label: 'Lokasi', max: 200 },
      { type: 'date', name: 'activity_date', label: 'Tanggal kegiatan' },
      { type: 'image', name: 'cover_path', label: 'Gambar sampul', bucket: 'public-media', folder: 'community' },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 8 },
      { type: 'select', name: 'status', label: 'Status', required: true, options: PROGRESS_STATUS },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di website' },
    ],
  },

  laporan: {
    table: 'public_reports', title: 'Laporan', singular: 'Laporan', roles: ROLES_EDITOR,
    select: 'id, title, report_type, period_label, is_published, created_at',
    searchField: 'title', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['reports'],
    columns: [
      { header: 'Laporan', cell: (r) => title(r, str(r.period_label)) },
      { header: 'Jenis', cell: (r) => ({ activity: 'Kegiatan', evaluation: 'Evaluasi', financial: 'Keuangan', other: 'Lainnya' } as Record<string, string>)[str(r.report_type)] ?? str(r.report_type) },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { report_type: 'activity' },
    fields: [
      { type: 'text', name: 'title', label: 'Judul laporan', required: true, max: 200 },
      { type: 'select', name: 'report_type', label: 'Jenis', required: true, options: [
        { value: 'activity', label: 'Laporan kegiatan' }, { value: 'evaluation', label: 'Evaluasi' },
        { value: 'financial', label: 'Keuangan' }, { value: 'other', label: 'Lainnya' }] },
      { type: 'text', name: 'period_label', label: 'Periode', max: 80, hint: 'Contoh: 2025/2026 atau Semester Ganjil 2026' },
      { type: 'textarea', name: 'summary', label: 'Ringkasan', rows: 4 },
      { type: 'pdf', name: 'file_path', label: 'Berkas PDF', bucket: 'public-docs', folder: 'reports' },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di website', hint: 'Pastikan laporan sudah disetujui sebelum ditayangkan.' },
    ],
  },

  bidang: {
    table: 'departments', title: 'Bidang', singular: 'Bidang', roles: ROLES_ADMIN,
    select: 'id, name, slug, description, sort_order', searchField: 'name', orderBy: { column: 'sort_order', ascending: true },
    publicKeys: ['departments', 'officers'],
    columns: [
      { header: 'Bidang', cell: (r) => title(r, str(r.description)) },
      { header: 'Slug', cell: (r) => <code className="text-xs">{str(r.slug)}</code> },
      { header: 'Urutan', cell: (r) => str(r.sort_order) },
    ],
    defaults: { sort_order: '0' },
    fields: [
      { type: 'text', name: 'name', label: 'Nama bidang', required: true, max: 120 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'name', required: true },
      { type: 'textarea', name: 'description', label: 'Deskripsi bidang', rows: 4 },
      { type: 'number', name: 'sort_order', label: 'Urutan tampil', hint: 'Angka kecil tampil lebih dulu.' },
    ],
  },

  jabatan: {
    table: 'positions', title: 'Jabatan', singular: 'Jabatan', roles: ROLES_ADMIN,
    select: 'id, title, level, sort_order', searchField: 'title', orderBy: { column: 'level', ascending: true },
    publicKeys: ['officers'],
    columns: [
      { header: 'Jabatan', cell: (r) => title(r) },
      { header: 'Level', cell: (r) => str(r.level) },
      { header: 'Urutan', cell: (r) => str(r.sort_order) },
    ],
    defaults: { level: '6', sort_order: '0' },
    fields: [
      { type: 'text', name: 'title', label: 'Nama jabatan', required: true, max: 120 },
      { type: 'number', name: 'level', label: 'Level hierarki', required: true,
        hint: '1–4 tampil sebagai pimpinan inti (Ketua, Wakil, Sekretaris…), 5 = koordinator bidang, 6 ke atas = anggota.' },
      { type: 'number', name: 'sort_order', label: 'Urutan tampil' },
    ],
  },

  pengurus: {
    table: 'officers', title: 'Pengurus', singular: 'Pengurus', roles: ROLES_ADMIN,
    select: 'id, full_name, period, is_published, position:positions(title), department:departments(name)',
    searchField: 'full_name', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['officers'],
    columns: [
      { header: 'Nama', cell: (r) => title(r) },
      { header: 'Jabatan', cell: (r) => rel(r.position, 'title') },
      { header: 'Bidang', cell: (r) => rel(r.department) },
      { header: 'Periode', cell: (r) => str(r.period) },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { sort_order: '0' },
    fields: [
      { type: 'text', name: 'full_name', label: 'Nama lengkap', required: true, max: 120 },
      { type: 'relation', name: 'position_id', label: 'Jabatan', table: 'positions', labelField: 'title', required: true },
      { type: 'relation', name: 'department_id', label: 'Bidang', table: 'departments', labelField: 'name' },
      { type: 'text', name: 'period', label: 'Periode kepengurusan', required: true, max: 30, hint: 'Contoh: 2025/2026' },
      { type: 'image', name: 'photo_path', label: 'Foto', bucket: 'public-media', folder: 'officers',
        hint: 'Unggah foto hanya dengan izin yang bersangkutan.' },
      { type: 'textarea', name: 'duty_description', label: 'Deskripsi tugas', rows: 4 },
      { type: 'checkbox', name: 'is_coordinator', label: 'Koordinator bidang' },
      { type: 'number', name: 'sort_order', label: 'Urutan tampil', hint: 'Angka kecil tampil lebih dulu dalam jabatan yang sama.' },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di website', hint: 'Jangan tampilkan data pribadi (kontak, alamat) — formulir ini memang tidak menyimpannya.' },
    ],
  },

  'kategori-forum': {
    table: 'forum_categories', title: 'Kategori Forum', singular: 'Kategori', roles: ROLES_MODERATOR,
    select: 'id, name, slug, description, sort_order, is_active', searchField: 'name', orderBy: { column: 'sort_order', ascending: true },
    publicKeys: ['forum-categories', 'forum-topics'],
    columns: [
      { header: 'Kategori', cell: (r) => title(r, str(r.description)) },
      { header: 'Slug', cell: (r) => <code className="text-xs">{str(r.slug)}</code> },
      { header: 'Aktif', cell: (r) => published(r.is_active) },
    ],
    defaults: { is_active: true, sort_order: '0' },
    fields: [
      { type: 'text', name: 'name', label: 'Nama kategori', required: true, max: 80 },
      { type: 'slug', name: 'slug', label: 'Slug (bagian URL)', from: 'name', required: true },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 3 },
      { type: 'number', name: 'sort_order', label: 'Urutan tampil' },
      { type: 'checkbox', name: 'is_active', label: 'Aktif', hint: 'Kategori nonaktif tidak tampil dan tidak dapat dipakai untuk topik baru.' },
    ],
  },

  sponsor: {
    table: 'sponsors', title: 'Sponsor yang Ditampilkan', singular: 'Sponsor', roles: ROLES_ADMIN,
    select: 'id, name, website_url, sort_order, is_published', searchField: 'name', orderBy: { column: 'sort_order', ascending: true },
    publicKeys: ['sponsors'],
    columns: [
      { header: 'Sponsor', cell: (r) => title(r, str(r.website_url)) },
      { header: 'Urutan', cell: (r) => str(r.sort_order) },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { sort_order: '0' },
    validate: (p) => (p.website_url && !/^https?:\/\/\S+$/i.test(String(p.website_url)) ? 'Tautan situs harus diawali http:// atau https://' : null),
    fields: [
      { type: 'text', name: 'name', label: 'Nama sponsor / mitra', required: true, max: 200 },
      { type: 'image', name: 'logo_path', label: 'Logo', bucket: 'public-media', folder: 'sponsors', hint: 'Tampilkan logo hanya dengan izin mitra.' },
      { type: 'textarea', name: 'description', label: 'Deskripsi singkat', rows: 3 },
      { type: 'text', name: 'website_url', label: 'Situs web', max: 300, hint: 'Contoh: https://contoh.id' },
      { type: 'relation', name: 'request_id', label: 'Permohonan asal', table: 'partnership_requests', labelField: 'org_name',
        hint: 'Opsional. Bila dipilih, sponsor hanya dapat ditayangkan jika mitra menyetujui publikasi.' },
      { type: 'number', name: 'sort_order', label: 'Urutan tampil' },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di halaman Mitra' },
    ],
  },

  'donasi-catatan': {
    table: 'donations', title: 'Catatan Donasi', singular: 'Donasi', roles: ROLES_ADMIN,
    select: 'id, donor_name, amount, status, donated_at, is_published, display_publicly', searchField: 'donor_name', orderBy: { column: 'donated_at', ascending: false },
    publicKeys: ['public-donations', 'donation-summary'],
    columns: [
      { header: 'Tanggal', cell: (r) => formatDate(str(r.donated_at)) },
      { header: 'Donatur', cell: (r) => title({ ...r, title: r.donor_name || '(tanpa nama)' }) },
      { header: 'Jumlah', cell: (r) => <span className="font-semibold text-emerald-800">{formatRupiah(r.amount as number)}</span> },
      { header: 'Status', cell: (r) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${({ pending: 'bg-amber-100 text-amber-800', verified: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800' } as Record<string, string>)[str(r.status)] ?? ''}`}>{({ pending: 'Menunggu', verified: 'Terverifikasi', rejected: 'Ditolak' } as Record<string, string>)[str(r.status)] ?? str(r.status)}</span> },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    defaults: { status: 'pending', donated_at: new Date().toLocaleDateString('en-CA') },
    onCreate: ({ userId }) => ({ recorded_by: userId }),
    validate: (p) => (!(Number(p.amount) > 0) ? 'Jumlah donasi harus lebih dari 0.' : null),
    fields: [
      { type: 'text', name: 'donor_name', label: 'Nama donatur', max: 150, hint: 'Boleh dikosongkan.' },
      { type: 'checkbox', name: 'display_publicly', label: 'Donatur mengizinkan namanya ditampilkan', hint: 'Tanpa izin, publik hanya melihat “Anonim”.' },
      { type: 'number', name: 'amount', label: 'Jumlah (Rp)', required: true },
      { type: 'date', name: 'donated_at', label: 'Tanggal diterima', required: true },
      { type: 'text', name: 'purpose', label: 'Peruntukan', max: 300 },
      { type: 'relation', name: 'program_id', label: 'Program yang didanai', table: 'programs', labelField: 'title' },
      { type: 'select', name: 'status', label: 'Status verifikasi', required: true, options: [
        { value: 'pending', label: 'Menunggu verifikasi' }, { value: 'verified', label: 'Terverifikasi' }, { value: 'rejected', label: 'Ditolak' }] },
      { type: 'checkbox', name: 'is_published', label: 'Tampilkan di halaman transparansi', hint: 'Hanya donasi berstatus Terverifikasi yang akan tampil, dan hanya bila halaman donasi diaktifkan.' },
      { type: 'textarea', name: 'internal_note', label: 'Catatan internal', rows: 3, hint: 'Tidak pernah ditampilkan ke publik.' },
    ],
  },

  'donasi-laporan': {
    table: 'donation_reports', title: 'Laporan Donasi', singular: 'Laporan', roles: ROLES_ADMIN,
    select: 'id, title, period_label, total_in, total_out, is_published, approved_at', searchField: 'title', orderBy: { column: 'created_at', ascending: false },
    publicKeys: ['donation-reports'],
    columns: [
      { header: 'Laporan', cell: (r) => title(r, str(r.period_label)) },
      { header: 'Pemasukan', cell: (r) => (r.total_in != null ? formatRupiah(r.total_in as number) : '—') },
      { header: 'Pengeluaran', cell: (r) => (r.total_out != null ? formatRupiah(r.total_out as number) : '—') },
      { header: 'Tampil', cell: (r) => published(r.is_published) },
    ],
    // Menayangkan = menyetujui: pengguna saat ini tercatat sebagai penyetuju.
    transform: (p, { userId }) => (p.is_published
      ? { ...p, approved_by: userId, approved_at: new Date().toISOString() }
      : { ...p, approved_by: null, approved_at: null }),
    fields: [
      { type: 'text', name: 'title', label: 'Judul laporan', required: true, max: 200 },
      { type: 'text', name: 'period_label', label: 'Periode', max: 80, hint: 'Contoh: Semester Ganjil 2026' },
      { type: 'textarea', name: 'summary', label: 'Ringkasan', rows: 4 },
      { type: 'number', name: 'total_in', label: 'Total pemasukan (Rp)' },
      { type: 'number', name: 'total_out', label: 'Total pengeluaran (Rp)' },
      { type: 'pdf', name: 'file_path', label: 'Berkas laporan (PDF)', bucket: 'public-docs', folder: 'donation-reports' },
      { type: 'checkbox', name: 'is_published', label: 'Setujui dan tayangkan', hint: 'Dengan mencentang, Anda menyatakan laporan ini telah diperiksa dan disetujui. Nama Anda tercatat sebagai penyetuju.' },
    ],
  },

  'pmb-periode': {
    table: 'pmb_periods', title: 'Periode Pendaftaran', singular: 'Periode', roles: ROLES_PMB_MANAGER,
    select: 'id, academic_year, name, start_date, end_date, is_active', searchField: 'name', orderBy: { column: 'start_date', ascending: false },
    publicKeys: ['pmb'],
    columns: [
      { header: 'Periode', cell: (r) => title(r, `Tahun akademik ${str(r.academic_year)}`) },
      { header: 'Pendaftaran', cell: (r) => `${formatDate(str(r.start_date))} – ${formatDate(str(r.end_date))}` },
      { header: 'Aktif', cell: (r) => published(r.is_active) },
    ],
    validate: (p) => (p.end_date && p.start_date && String(p.end_date) < String(p.start_date) ? 'Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.' : null),
    fields: [
      { type: 'text', name: 'academic_year', label: 'Tahun akademik', required: true, max: 30, hint: 'Isi sesuai ketetapan resmi kampus.' },
      { type: 'text', name: 'name', label: 'Nama periode / gelombang', required: true, max: 150 },
      { type: 'date', name: 'start_date', label: 'Pendaftaran dibuka', required: true },
      { type: 'date', name: 'end_date', label: 'Pendaftaran ditutup', required: true },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 4 },
      { type: 'textarea', name: 'requirements', label: 'Persyaratan', rows: 8, hint: 'Isi hanya persyaratan resmi dari kampus. Pisahkan paragraf dengan baris kosong.' },
      { type: 'textarea', name: 'schedule', label: 'Jadwal', rows: 6, hint: 'Isi hanya jadwal resmi dari kampus.' },
      { type: 'checkbox', name: 'is_active', label: 'Aktif (tampil di halaman publik)', hint: 'Periode aktif hanya tampil bila fitur PMB diaktifkan di Pengaturan Website, dan hanya dapat didaftari pada rentang tanggal di atas.' },
    ],
  },

  'pmb-prodi': {
    table: 'study_programs', title: 'Program Studi', singular: 'Program studi', roles: ROLES_PMB_MANAGER,
    select: 'id, name, level, sort_order, is_active', searchField: 'name', orderBy: { column: 'sort_order', ascending: true },
    publicKeys: ['pmb'],
    columns: [
      { header: 'Program studi', cell: (r) => title(r, str(r.level)) },
      { header: 'Urutan', cell: (r) => str(r.sort_order) },
      { header: 'Aktif', cell: (r) => published(r.is_active) },
    ],
    defaults: { sort_order: '0' },
    fields: [
      { type: 'text', name: 'name', label: 'Nama program studi', required: true, max: 150, hint: 'Isi sesuai nama resmi yang telah terakreditasi/berizin.' },
      { type: 'text', name: 'level', label: 'Jenjang', max: 50, hint: 'Contoh: S1' },
      { type: 'textarea', name: 'description', label: 'Deskripsi', rows: 4 },
      { type: 'number', name: 'sort_order', label: 'Urutan tampil' },
      { type: 'checkbox', name: 'is_active', label: 'Aktif (dapat dipilih pendaftar)' },
    ],
  },
}
