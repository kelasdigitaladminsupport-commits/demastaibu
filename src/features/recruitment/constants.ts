export const RECRUIT_STATUSES = [
  { value: 'submitted', label: 'Terkirim', cls: 'bg-slate-100 text-slate-700' },
  { value: 'reviewing', label: 'Sedang ditinjau', cls: 'bg-sky-100 text-sky-800' },
  { value: 'interview', label: 'Tahap wawancara', cls: 'bg-amber-100 text-amber-800' },
  { value: 'accepted', label: 'Diterima', cls: 'bg-emerald-100 text-emerald-800' },
  { value: 'rejected', label: 'Tidak diterima', cls: 'bg-red-100 text-red-800' },
  { value: 'withdrawn', label: 'Mengundurkan diri', cls: 'bg-slate-200 text-slate-600' },
] as const
export const RECRUIT_STATUS_LABEL: Record<string, string> = Object.fromEntries(RECRUIT_STATUSES.map((s) => [s.value, s.label]))
export const RECRUIT_STATUS_CLS: Record<string, string> = Object.fromEntries(RECRUIT_STATUSES.map((s) => [s.value, s.cls]))
/** Pendaftar masih boleh mengundurkan diri pada status ini (ditegakkan juga oleh database). */
export const WITHDRAWABLE = ['submitted', 'reviewing']

/**
 * Persyaratan disimpan sebagai teks: satu syarat per baris (disalin dari Pedoman Kemahasiswaan).
 * Penomoran/butir di awal baris ("1.", "a)", "-", "•") dibuang agar tampil rapi sebagai daftar centang.
 */
export function splitRequirements(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^(?:[-*•–]+|\(?\d{1,2}[.)]|\(?[a-zA-Z][.)])\s+/, '').trim())
    .filter(Boolean)
}

/** Status jendela pendaftaran berdasarkan tanggal (format YYYY-MM-DD, zona Jakarta). */
export function windowState(start: string, end: string, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })): 'upcoming' | 'open' | 'closed' {
  if (today < start) return 'upcoming'
  if (today > end) return 'closed'
  return 'open'
}
