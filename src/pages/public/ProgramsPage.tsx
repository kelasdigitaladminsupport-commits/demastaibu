import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { fetchDepartments, fetchPrograms, PAGE_SIZE } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDateRange } from '../../utils/format'

const STATUS = [
  { value: 'planned', label: 'Direncanakan' }, { value: 'ongoing', label: 'Berlangsung' },
  { value: 'done', label: 'Selesai' }, { value: 'cancelled', label: 'Dibatalkan' },
]

export function ProgramsPage() {
  useDocumentTitle('Program Kerja')
  const { page, q, get, set } = useListParams()
  const deps = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })
  const status = get('status')
  const depSlug = get('bidang')
  const departmentId = deps.data?.find((d) => d.slug === depSlug)?.id ?? ''

  const programs = useQuery({
    queryKey: ['programs', page, q, status, departmentId],
    queryFn: () => fetchPrograms({ page, q, status, departmentId }),
    placeholderData: (prev) => prev,
    enabled: !depSlug || deps.isSuccess,
  })

  return (
    <>
      <PageHeader title="Program Kerja" description="Rencana dan capaian program kerja DEMA." />
      <Container>
        <div className="mb-8 grid gap-3 md:grid-cols-[1fr_14rem_14rem]">
          <SearchBar value={q} onSearch={(v) => set({ q: v })} placeholder="Cari program kerja" />
          <FilterSelect label="Bidang" value={depSlug} onChange={(v) => set({ bidang: v })} options={(deps.data ?? []).map((d) => ({ value: d.slug, label: d.name }))} />
          <FilterSelect label="Status" value={status} onChange={(v) => set({ status: v })} options={STATUS} />
        </div>
        <QueryBoundary isLoading={programs.isLoading} error={programs.error} onRetry={() => programs.refetch()} isEmpty={(programs.data?.items.length ?? 0) === 0}
          emptyIcon={ClipboardList} emptyTitle="Belum ada program kerja" emptyDescription="Program kerja akan tampil di sini setelah dipublikasikan.">
          <div className="grid gap-5 md:grid-cols-2">
            {programs.data?.items.map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-slate-900">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                {p.department && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold-dark">{p.department.name}</p>}
                {p.description && <p className="mt-3 line-clamp-4 text-sm text-slate-600">{p.description}</p>}
                {p.start_date && <p className="mt-3 text-xs text-slate-500">{formatDateRange(p.start_date, p.end_date)}</p>}
              </article>
            ))}
          </div>
          <Pagination page={page} total={programs.data?.total ?? 0} pageSize={PAGE_SIZE} onChange={(n) => set({ hal: n })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
