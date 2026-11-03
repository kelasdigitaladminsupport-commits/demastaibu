import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Images } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { CoverImage } from '../../components/ui/CoverImage'
import { fetchGalleries, PAGE_SIZE } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../utils/format'

export function GalleryListPage() {
  useDocumentTitle('Galeri Kegiatan')
  const { page, set } = useListParams()
  const q = useQuery({ queryKey: ['galleries', page], queryFn: () => fetchGalleries(page), placeholderData: (prev) => prev })
  return (
    <>
      <PageHeader title="Galeri Kegiatan" description="Dokumentasi foto kegiatan DEMA." />
      <Container>
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={(q.data?.items.length ?? 0) === 0}
          emptyIcon={Images} emptyTitle="Belum ada galeri" emptyDescription="Foto kegiatan akan tampil di sini.">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {q.data?.items.map((g) => (
              <Link key={g.id} to={`/galeri/${g.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md">
                <CoverImage path={g.cover_path} alt={g.title} className="aspect-4/3 w-full" />
                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-emerald-800">{g.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(g.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} total={q.data?.total ?? 0} pageSize={PAGE_SIZE} onChange={(p) => set({ hal: p })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
