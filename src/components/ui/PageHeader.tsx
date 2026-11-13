import type { ReactNode } from 'react'

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="border-b border-emerald-900/10 bg-emerald-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        <div className="mt-3 h-1 w-16 rounded bg-gold" />
        {description && <p className="mt-4 max-w-2xl text-emerald-100">{description}</p>}
        {children}
      </div>
    </div>
  )
}
