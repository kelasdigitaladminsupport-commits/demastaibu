import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Images, MapPin } from 'lucide-react'
import { Container } from '../../components/ui/Container'
import { CoverImage } from '../../components/ui/CoverImage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TextContent } from '../../components/ui/TextContent'
import { ShareButtons } from '../../components/ui/ShareButtons'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { NotFoundPage } from './NotFoundPage'
import { fetchEventBySlug, fetchEventGalleries } from '../../services/content'
import { useDocumentTitle, useSeoDescription } from '../../hooks/useDocumentTitle'
import { formatDateRange, formatDateTime } from '../../utils/format'

export function EventDetailPage() {
  const { slug = '' } = useParams()
  const q = useQuery({ queryKey: ['events', 'detail', slug], queryFn: () => fetchEventBySlug(slug) })
  const e = q.data
  const galleries = useQuery({ queryKey: ['event-galleries', e?.id], queryFn: () => fetchEventGalleries(e!.id), enabled: Boolean(e) })
  useDocumentTitle(e?.title)
  useSeoDescription(e?.description)

  if (!q.isLoading && !q.error && !e) return <NotFoundPage />

  return (
    <Container className="max-w-3xl">
      <Link to="/agenda" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline">
        <ArrowLeft className="size-4" /> Semua agenda
      </Link>
      <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!e} emptyTitle="Agenda tidak ditemukan">
        {e && (
          <article>
            <StatusBadge status={e.status} />
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-emerald-950 sm:text-4xl">{e.title}</h1>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden />
                {e.end_date ? formatDateRange(e.event_date, e.end_date) : formatDateTime(e.event_date)}</li>
              {e.location && <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> {e.location}</li>}
            </ul>
            {e.poster_path && <CoverImage path={e.poster_path} alt={`Poster ${e.title}`} className="mt-6 max-h-[32rem] w-full rounded-2xl" />}
            {e.description && <TextContent text={e.description} className="mt-8" />}

            {(galleries.data?.length ?? 0) > 0 && (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-emerald-950"><Images className="size-5" /> Dokumentasi</h2>
                <ul className="mt-3 space-y-2">
                  {galleries.data?.map((g) => (
                    <li key={g.id}><Link to={`/galeri/${g.id}`} className="font-medium text-emerald-800 hover:underline">{g.title}</Link></li>
                  ))}
                </ul>
              </section>
            )}
            <div className="mt-10 border-t border-slate-200 pt-6"><ShareButtons title={e.title} /></div>
          </article>
        )}
      </QueryBoundary>
    </Container>
  )
}
