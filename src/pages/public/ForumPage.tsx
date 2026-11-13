import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, Lock, MessageCircle, MessagesSquare, Pin, Plus, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { fetchForumCategories, fetchTopics, FORUM_PAGE } from '../../services/forum'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../utils/format'

export function ForumPage() {
  useDocumentTitle('Forum Diskusi')
  const { page, q, get, set } = useListParams()
  const settings = useSiteSettings()
  const cats = useQuery({ queryKey: ['forum-categories'], queryFn: fetchForumCategories })
  const catSlug = get('kategori')
  const categoryId = cats.data?.find((c) => c.slug === catSlug)?.id
  const evaluationOnly = get('evaluasi') === '1'

  const topics = useQuery({
    queryKey: ['forum-topics', page, q, categoryId ?? '', evaluationOnly],
    queryFn: () => fetchTopics({ page, q, categoryId, evaluationOnly }),
    placeholderData: (p) => p,
    enabled: !catSlug || cats.isSuccess,
  })

  if (settings.data?.forum_enabled === false) {
    return (<><PageHeader title="Forum Diskusi" /><EmptyState icon={Lock} title="Forum sedang dinonaktifkan" description="Silakan kembali lagi nanti." /></>)
  }

  return (
    <>
      <PageHeader title="Forum Diskusi" description="Ruang diskusi mahasiswa. Siapa pun dapat membaca; untuk menulis Anda perlu akun.">
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink to="/forum/baru" variant="gold"><Plus className="size-4" /> Buat topik</ButtonLink>
          <Link to="/aturan-komunitas" className="inline-flex items-center text-sm text-emerald-100 underline">Aturan komunitas</Link>
        </div>
      </PageHeader>
      <Container>
        <div className="mb-8 grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-center">
          <SearchBar value={q} onSearch={(v) => set({ q: v })} placeholder="Cari topik" />
          <FilterSelect label="Kategori" value={catSlug} onChange={(v) => set({ kategori: v })} options={(cats.data ?? []).map((c) => ({ value: c.slug, label: c.name }))} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={evaluationOnly} onChange={(e) => set({ evaluasi: e.target.checked ? '1' : null })} className="size-4 rounded border-slate-300 text-emerald-700" />
            Bahan evaluasi
          </label>
        </div>

        <QueryBoundary isLoading={topics.isLoading} error={topics.error} onRetry={() => topics.refetch()} isEmpty={(topics.data?.items.length ?? 0) === 0}
          emptyIcon={MessagesSquare} emptyTitle="Belum ada topik" emptyDescription="Jadilah yang pertama memulai diskusi.">
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {topics.data?.items.map((t) => (
              <li key={t.id}>
                <Link to={`/forum/topik/${t.id}`} className="block p-4 transition hover:bg-slate-50 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {t.is_pinned && <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 font-semibold text-gold-dark"><Pin className="size-3" /> Disematkan</span>}
                    {t.is_evaluation_material && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800"><ClipboardCheck className="size-3" /> Bahan evaluasi</span>}
                    {t.status === 'closed' && <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700"><Lock className="size-3" /> Ditutup</span>}
                    {t.category && <span className="font-semibold uppercase tracking-wide text-gold-dark">{t.category.name}</span>}
                  </div>
                  <h3 className="mt-1.5 font-semibold text-slate-900">{t.title}</h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{topics.data?.names[t.author_id] ?? 'Pengguna'}</span>
                    <span>{formatDate(t.created_at)}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" /> {t.comments?.[0]?.count ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="size-3.5" /> {topics.data?.likeMap[t.id] ?? 0}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} total={topics.data?.total ?? 0} pageSize={FORUM_PAGE} onChange={(p) => set({ hal: p })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
