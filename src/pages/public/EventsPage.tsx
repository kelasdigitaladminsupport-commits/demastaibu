import { useQuery } from '@tanstack/react-query'
import { CalendarX } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { EventCard } from '../../components/EventCard'
import { fetchEvents, PAGE_SIZE, type EventFilter } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../utils/cn'

const TABS: Array<{ value: EventFilter; label: string }> = [
  { value: 'upcoming', label: 'Mendatang' },
  { value: 'done', label: 'Selesai' },
  { value: 'all', label: 'Semua' },
]

export function EventsPage() {
  useDocumentTitle('Agenda Kegiatan')
  const { page, q, get, set } = useListParams()
  const filter = (TABS.find((t) => t.value === get('tampil'))?.value ?? 'upcoming') as EventFilter

  const events = useQuery({
    queryKey: ['events', page, q, filter],
    queryFn: () => fetchEvents({ page, q, filter }),
    placeholderData: (prev) => prev,
  })

  return (
    <>
      <PageHeader title="Agenda Kegiatan" description="Jadwal kegiatan DEMA dan dokumentasinya." />
      <Container>
        <div className="mb-8 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <div role="tablist" aria-label="Filter agenda" className="inline-flex rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => (
              <button key={t.value} role="tab" aria-selected={filter === t.value} type="button" onClick={() => set({ tampil: t.value })}
                className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', filter === t.value ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>
                {t.label}
              </button>
            ))}
          </div>
          <SearchBar value={q} onSearch={(v) => set({ q: v })} placeholder="Cari agenda" />
        </div>
        <QueryBoundary isLoading={events.isLoading} error={events.error} onRetry={() => events.refetch()} isEmpty={(events.data?.items.length ?? 0) === 0}
          emptyIcon={CalendarX} emptyTitle="Belum ada agenda" emptyDescription={q ? 'Coba kata kunci lain.' : 'Agenda akan tampil di sini setelah dipublikasikan.'}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.data?.items.map((e) => <EventCard key={e.id} item={e} />)}
          </div>
          <Pagination page={page} total={events.data?.total ?? 0} pageSize={PAGE_SIZE} onChange={(p) => set({ hal: p })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
