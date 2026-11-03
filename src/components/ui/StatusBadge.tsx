import { cn } from '../../utils/cn'

const MAP: Record<string, { label: string; cls: string }> = {
  upcoming: { label: 'Akan datang', cls: 'bg-sky-100 text-sky-800' },
  ongoing: { label: 'Berlangsung', cls: 'bg-amber-100 text-amber-800' },
  done: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-800' },
  planned: { label: 'Direncanakan', cls: 'bg-slate-100 text-slate-700' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' }
  return <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', s.cls)}>{s.label}</span>
}
