import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  children?: ReactNode
}

export function EmptyState({ title, description, icon: Icon = Inbox, children }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="font-display text-xl font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
