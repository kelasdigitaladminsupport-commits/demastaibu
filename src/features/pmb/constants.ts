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

/** Jadwal perkuliahan yang dibuka kampus. Nilai 'day'/'night' disimpan di kolom applicants.class_schedule. */
export const CLASS_SCHEDULES = [
  { value: 'day', label: 'Kelas Siang', time: '14.00 – 18.00 WIB' },
  { value: 'night', label: 'Kelas Malam', time: '18.00 – 21.00 WIB' },
] as const
export const CLASS_SCHEDULE_LABEL: Record<string, string> = Object.fromEntries(CLASS_SCHEDULES.map((s) => [s.value, s.label]))
/** Label + jam, mis. "Kelas Siang (14.00 – 18.00 WIB)". Pendaftar lama tanpa pilihan -> '—'. */
export const classScheduleText = (v: string | null | undefined) => {
  const s = CLASS_SCHEDULES.find((x) => x.value === v)
  return s ? `${s.label} (${s.time})` : '—'
}
