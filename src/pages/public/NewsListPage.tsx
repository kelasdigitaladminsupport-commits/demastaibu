import { useQuery } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { NewsCard } from '../../components/NewsCard'
import { fetchNews, fetchNewsCategories, PAGE_SIZE } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function NewsListPage() {
  useDocumentTitle('Berita dan Artikel')
  const { page, q, get, set } = useListParams()
  const categories = useQuery({ queryKey: ['news-categories'], queryFn: fetchNewsCategories })
  const categorySlug = get('kategori')
  const categoryId = categories.data?.find((c) => c.slug === categorySlug)?.id

  const news = useQuery({
    queryKey: ['news', page, q, categoryId ?? ''],
    queryFn: () => fetchNews({ page, q, categoryId }),
    placeholderData: (prev) => prev,
    enabled: !categorySlug || categories.isSuccess,
  })

  return (
    <>
      <PageHeader title="Berita dan Artikel" description="Kabar dan tulisan terbaru dari DEMA." />
      <Container>
        <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <SearchBar value={q} onSearch={(v) => set({ q: v })} placeholder="Cari judul berita" />
          <FilterSelect label="Kategori" value={categorySlug} onChange={(v) => set({ kategori: v })}
            options={(categories.data ?? []).map((c) => ({ value: c.slug, label: c.name }))} />
        </div>
        <QueryBoundary isLoading={news.isLoading} error={news.error} onRetry={() => news.refetch()} isEmpty={(news.data?.items.length ?? 0) === 0}
          emptyIcon={Newspaper} emptyTitle={q || categorySlug ? 'Berita tidak ditemukan' : 'Belum ada berita'}
          emptyDescription={q || categorySlug ? 'Coba ubah kata kunci atau kategori.' : 'Berita akan tampil di sini setelah dipublikasikan.'}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.data?.items.map((n) => <NewsCard key={n.id} item={n} />)}
          </div>
          <Pagination page={page} total={news.data?.total ?? 0} pageSize={PAGE_SIZE} onChange={(p) => set({ hal: p })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
