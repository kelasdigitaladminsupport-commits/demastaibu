const TZ = 'Asia/Jakarta'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: TZ }).format(new Date(iso))
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: TZ }).format(new Date(iso))
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start)
}

export function formatRupiah(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0)
}
