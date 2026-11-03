import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-6xl px-4 py-10', className)}>{children}</div>
}
