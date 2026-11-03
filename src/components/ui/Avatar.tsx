import { useState } from 'react'
import { publicUrl } from '../../utils/storage'
import { cn } from '../../utils/cn'

export function Avatar({ path, name, className }: { path: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = publicUrl(path)
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  if (!src || failed) {
    return <span className={cn('grid place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-800', className)} aria-hidden>{initials}</span>
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={cn('rounded-full object-cover', className)} />
}
