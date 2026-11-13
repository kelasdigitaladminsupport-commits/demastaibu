import { Loader2 } from 'lucide-react'
import { BrandLoader } from '../BrandLoader'

/** Spinner kecil untuk dipakai di dalam teks/tombol. */
export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-600">
      <Loader2 className="size-5 animate-spin text-emerald-700" aria-hidden />
      {label}
    </span>
  )
}

/** Pemuatan tingkat halaman: animasi bermerek yang sama dengan layar loading global. */
export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <BrandLoader size="sm" label={label ?? 'Memuat…'} />
    </div>
  )
}
