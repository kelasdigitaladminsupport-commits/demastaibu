import { Hammer } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import type { AdminModule } from '../../utils/adminModules'

export function AdminModulePage({ module }: { module: AdminModule }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-emerald-950">{module.label}</h1>
      <EmptyState icon={Hammer} title="Modul ini sedang disiapkan" description={`Dibangun pada Tahap ${module.stage}.`} />
    </div>
  )
}
