import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { OfficerCard } from '../../components/OfficerCard'
import { PeriodSelect } from '../../components/PeriodSelect'
import { useOfficersByPeriod } from '../../features/officers/useOfficers'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { Officer } from '../../types/content'

const CORE_MAX_LEVEL = 4   // Ketua, Wakil Ketua, Sekretaris, Wakil Sekretaris (lihat tabel positions)
const COORD_LEVEL = 5

export function StructurePage() {
  useDocumentTitle('Struktur Kepengurusan')
  const { query, periods, period, officers, setPeriod } = useOfficersByPeriod()

  const sorter = (a: Officer, b: Officer) => a.position.level - b.position.level || a.sort_order - b.sort_order
  const core = officers.filter((o) => o.position.level <= CORE_MAX_LEVEL).sort(sorter)
  const coordinators = officers.filter((o) => o.position.level === COORD_LEVEL || (o.is_coordinator && o.position.level > CORE_MAX_LEVEL)).sort(sorter)

  const tiers = new Map<number, Officer[]>()
  for (const o of core) tiers.set(o.position.level, [...(tiers.get(o.position.level) ?? []), o])

  return (
    <>
      <PageHeader title="Struktur Kepengurusan" description="Susunan pengurus DEMA." />
      <Container className="space-y-12">
        <QueryBoundary isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} isEmpty={officers.length === 0}
          emptyTitle="Struktur belum diisi" emptyDescription="Data pengurus belum dipublikasikan.">
          <PeriodSelect periods={periods} value={period} onChange={setPeriod} />

          <div className="space-y-6">
            {[...tiers.entries()].sort(([a], [b]) => a - b).map(([level, list]) => (
              <div key={level} className="flex flex-wrap justify-center gap-4">
                {list.map((o) => <div key={o.id} className="w-full max-w-xs"><OfficerCard officer={o} highlight={level === 1} /></div>)}
              </div>
            ))}
          </div>

          {coordinators.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold text-emerald-950">Koordinator Bidang</h2>
              <div className="mt-2 h-1 w-12 rounded bg-gold" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {coordinators.map((o) => <OfficerCard key={o.id} officer={o} />)}
              </div>
            </section>
          )}
        </QueryBoundary>
      </Container>
    </>
  )
}
