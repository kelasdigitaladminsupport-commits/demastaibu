import { useBranding } from '../features/branding/useBranding'
import { cn } from '../utils/cn'

/** Animasi loading bermerek: cincin berputar mengelilingi logo (atau huruf "D" bila logo belum diunggah). */
export function BrandLoader({ size = 'md', label = 'Memuat…', className }: { size?: 'sm' | 'md'; label?: string | null; className?: string }) {
  const { logoUrl } = useBranding()
  const dim = size === 'sm' ? 'size-16' : 'size-24'
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center gap-3', className)}>
      <div className={cn('brand-loader relative grid place-items-center', dim)}>
        <span className="brand-ring absolute inset-0 rounded-full" aria-hidden />
        {logoUrl
          ? <img src={logoUrl} alt="" className="brand-core size-[62%] object-contain" />
          : <span className="brand-core grid size-[62%] place-items-center rounded-full bg-emerald-700 font-display text-xl font-bold text-white" aria-hidden>D</span>}
      </div>
      {label ? <p className="text-sm font-medium text-emerald-900">{label}</p> : <span className="sr-only">Memuat</span>}
    </div>
  )
}
