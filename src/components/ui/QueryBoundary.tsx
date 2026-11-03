import type { ReactNode } from 'react'
import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { PageLoading } from './Loading'
import { Button } from './Button'

interface QueryBoundaryProps {
  isLoading: boolean
  error: unknown
  isEmpty: boolean
  emptyTitle: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  onRetry?: () => void
  children: ReactNode
}

/** Seragamkan tampilan loading / galat / kosong untuk semua halaman data. */
export function QueryBoundary({ isLoading, error, isEmpty, emptyTitle, emptyDescription, emptyIcon, onRetry, children }: QueryBoundaryProps) {
  if (isLoading) return <PageLoading />
  if (error) {
    return (
      <EmptyState icon={AlertTriangle} title="Data gagal dimuat" description="Periksa koneksi internet Anda, lalu coba lagi.">
        {onRetry && <Button variant="outline" onClick={onRetry}>Coba lagi</Button>}
      </EmptyState>
    )
  }
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
  return <>{children}</>
}
