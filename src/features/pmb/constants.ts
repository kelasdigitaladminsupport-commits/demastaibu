export const APPLICANT_STATUSES = [
  { value: 'submitted', label: 'Terkirim', cls: 'bg-slate-100 text-slate-700' },
  { value: 'verifying', label: 'Sedang diverifikasi', cls: 'bg-sky-100 text-sky-800' },
  { value: 'need_revision', label: 'Perlu perbaikan', cls: 'bg-amber-100 text-amber-800' },
  { value: 'verified', label: 'Terverifikasi', cls: 'bg-teal-100 text-teal-800' },
  { value: 'accepted', label: 'Diterima', cls: 'bg-emerald-100 text-emerald-800' },
  { value: 'rejected', label: 'Tidak diterima', cls: 'bg-red-100 text-red-800' },
  { value: 'withdrawn', label: 'Mengundurkan diri', cls: 'bg-slate-200 text-slate-600' },
] as const
export const APPLICANT_STATUS_LABEL: Record<string, string> = Object.fromEntries(APPLICANT_STATUSES.map((s) => [s.value, s.label]))
export const APPLICANT_STATUS_CLS: Record<string, string> = Object.fromEntries(APPLICANT_STATUSES.map((s) => [s.value, s.cls]))
/** Pendaftar hanya boleh mengubah data/dokumen pada status ini (ditegakkan juga oleh RLS). */
export const EDITABLE_STATUSES = ['submitted', 'need_revision']
export const GENDER_LABEL: Record<string, string> = { male: 'Laki-laki', female: 'Perempuan' }
