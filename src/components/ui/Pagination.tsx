import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'

interface PaginationProps { page: number; total: number; pageSize: number; onChange: (page: number) => void }

export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)
  const btn = 'grid min-w-9 place-items-center rounded-lg border px-2 py-1.5 text-sm font-medium'

  return (
    <nav aria-label="Halaman" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Sebelumnya"
        className={cn(btn, 'border-slate-300 hover:bg-slate-50 disabled:opacity-40')}>
        <ChevronLeft className="size-4" />
      </button>
      {nums.map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}
          className={cn(btn, n === page ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 hover:bg-slate-50')}>
          {n}
        </button>
      ))}
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Berikutnya"
        className={cn(btn, 'border-slate-300 hover:bg-slate-50 disabled:opacity-40')}>
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
