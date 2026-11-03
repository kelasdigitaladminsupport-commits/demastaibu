export const CATEGORIES = [
  { value: 'kritik', label: 'Kritik' },
  { value: 'saran', label: 'Saran' },
  { value: 'ide_program', label: 'Ide program kerja' },
  { value: 'evaluasi_kegiatan', label: 'Evaluasi kegiatan' },
  { value: 'keluhan', label: 'Keluhan' },
  { value: 'akademik', label: 'Aspirasi akademik' },
  { value: 'fasilitas', label: 'Aspirasi fasilitas' },
  { value: 'sosial', label: 'Kegiatan sosial' },
  { value: 'kolaborasi', label: 'Usulan kolaborasi' },
] as const

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

export const STATUSES = [
  { value: 'received', label: 'Diterima', cls: 'bg-slate-100 text-slate-700' },
  { value: 'reviewed', label: 'Ditinjau', cls: 'bg-sky-100 text-sky-800' },
  { value: 'need_info', label: 'Membutuhkan informasi tambahan', cls: 'bg-amber-100 text-amber-800' },
  { value: 'discussed', label: 'Dibahas', cls: 'bg-indigo-100 text-indigo-800' },
  { value: 'in_progress', label: 'Ditindaklanjuti', cls: 'bg-teal-100 text-teal-800' },
  { value: 'done', label: 'Selesai', cls: 'bg-emerald-100 text-emerald-800' },
  { value: 'rejected', label: 'Tidak dapat ditindaklanjuti', cls: 'bg-red-100 text-red-800' },
] as const

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]))
export const STATUS_CLS: Record<string, string> = Object.fromEntries(STATUSES.map((s) => [s.value, s.cls]))
