export const PARTNER_TYPES = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'donor', label: 'Donatur' },
  { value: 'education', label: 'Lembaga pendidikan' },
  { value: 'umkm', label: 'UMKM' },
  { value: 'institution', label: 'Instansi' },
  { value: 'community', label: 'Komunitas' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'public', label: 'Masyarakat umum' },
] as const
export const PARTNER_TYPE_LABEL: Record<string, string> = Object.fromEntries(PARTNER_TYPES.map((t) => [t.value, t.label]))

export const COOPERATION_SUGGESTIONS = [
  'Sponsor kegiatan', 'Donasi', 'Kolaborasi program', 'Pelatihan / workshop', 'Penyediaan fasilitas', 'Kerja sama media', 'Lainnya',
]

export const PARTNER_STATUSES = [
  { value: 'received', label: 'Diterima', cls: 'bg-slate-100 text-slate-700' },
  { value: 'reviewed', label: 'Ditinjau', cls: 'bg-sky-100 text-sky-800' },
  { value: 'discussing', label: 'Dalam pembahasan', cls: 'bg-indigo-100 text-indigo-800' },
  { value: 'agreed', label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-800' },
  { value: 'declined', label: 'Tidak dilanjutkan', cls: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Selesai', cls: 'bg-teal-100 text-teal-800' },
] as const
export const PARTNER_STATUS_LABEL: Record<string, string> = Object.fromEntries(PARTNER_STATUSES.map((s) => [s.value, s.label]))
export const PARTNER_STATUS_CLS: Record<string, string> = Object.fromEntries(PARTNER_STATUSES.map((s) => [s.value, s.cls]))
