import { Hammer } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'

/** Penampung sementara. Dihapus per halaman seiring pembangunan tahap berikutnya. */
export function ComingSoonPage({ title, stage }: { title: string; stage: number }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={Hammer} title="Halaman ini sedang disiapkan" description={`Fitur ini dibangun pada Tahap ${stage}.`} />
    </>
  )
}
