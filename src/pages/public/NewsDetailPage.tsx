import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, User } from 'lucide-react'
import { Container } from '../../components/ui/Container'
import { CoverImage } from '../../components/ui/CoverImage'
import { TextContent } from '../../components/ui/TextContent'
import { ShareButtons } from '../../components/ui/ShareButtons'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { NotFoundPage } from './NotFoundPage'
import { fetchNewsBySlug } from '../../services/content'
import { useDocumentTitle, useSeoDescription } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../utils/format'

export function NewsDetailPage() {
  const { slug = '' } = useParams()
  const q = useQuery({ queryKey: ['news', 'detail', slug], queryFn: () => fetchNewsBySlug(slug) })
  useDocumentTitle(q.data?.title)
  useSeoDescription(q.data?.excerpt || q.data?.content)

  if (!q.isLoading && !q.error && !q.data) return <NotFoundPage />
  const n = q.data

  return (
    <Container className="max-w-3xl">
      <Link to="/berita" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline">
        <ArrowLeft className="size-4" /> Semua berita
      </Link>
      <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!n} emptyTitle="Berita tidak ditemukan">
        {n && (
          <article>
            {n.category && <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{n.category.name}</span>}
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-emerald-950 sm:text-4xl">{n.title}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {formatDate(n.published_at)}</span>
              {n.author_name && <span className="inline-flex items-center gap-1.5"><User className="size-4" aria-hidden /> {n.author_name}</span>}
            </p>
            {n.cover_path && <CoverImage path={n.cover_path} alt={n.title} className="mt-6 aspect-video w-full rounded-2xl" />}
            <TextContent text={n.content} className="mt-8" />
            <div className="mt-10 border-t border-slate-200 pt-6"><ShareButtons title={n.title} /></div>
          </article>
        )}
      </QueryBoundary>
    </Container>
  )
}
