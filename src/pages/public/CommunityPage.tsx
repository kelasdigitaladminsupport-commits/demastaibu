import { useQuery } from '@tanstack/react-query'
import { CalendarDays, HeartHandshake, MapPin } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { CoverImage } from '../../components/ui/CoverImage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TextContent } from '../../components/ui/TextContent'
import { fetchCommunityPrograms, PAGE_SIZE } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../utils/format'

export function CommunityPage() {
  useDocumentTitle('Pengabdian kepada Masyarakat')
  const { page, set } = useListParams()
  const q = useQuery({ queryKey: ['community', page], queryFn: () => fetchCommunityPrograms(page), placeholderData: (prev) => prev })
  return (
    <>
      <PageHeader title="Pengabdian kepada Masyarakat" description="Kegiatan sosial dan pengabdian DEMA." />
      <Container>
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={(q.data?.items.length ?? 0) === 0}
          emptyIcon={HeartHandshake} emptyTitle="Belum ada kegiatan pengabdian" emptyDescription="Kegiatan akan tampil di sini setelah dipublikasikan.">
          <div className="grid gap-6 md:grid-cols-2">
            {q.data?.items.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <CoverImage path={c.cover_path} alt={c.title} className="aspect-video w-full" />
                <div className="p-5">
                  <StatusBadge status={c.status} />
                  <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">{c.title}</h3>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {c.activity_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(c.activity_date)}</span>}
                    {c.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {c.location}</span>}
                  </p>
                  {c.description && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-emerald-800">Selengkapnya</summary>
                      <TextContent text={c.description} className="mt-2 text-sm" />
                    </details>
                  )}
                </div>
              </article>
            ))}
          </div>
          <Pagination page={page} total={q.data?.total ?? 0} pageSize={PAGE_SIZE} onChange={(p) => set({ hal: p })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
