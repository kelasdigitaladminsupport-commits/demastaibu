import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { fetchReports, PAGE_SIZE } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { publicUrl } from '../../utils/storage'
import { formatDate } from '../../utils/format'

const TYPES = [
  { value: 'activity', label: 'Laporan kegiatan' }, { value: 'evaluation', label: 'Evaluasi' },
  { value: 'financial', label: 'Keuangan' }, { value: 'other', label: 'Lainnya' },
]
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]))

export function ReportsPage() {
  useDocumentTitle('Laporan dan Evaluasi')
  const { page, get, set } = useListParams()
  const type = get('jenis')
  const q = useQuery({ queryKey: ['reports', page, type], queryFn: () => fetchReports({ page, type }), placeholderData: (prev) => prev })
  return (
    <>
      <PageHeader title="Laporan dan Evaluasi" description="Transparansi kegiatan dan evaluasi organisasi." />
      <Container className="max-w-4xl">
        <div className="mb-8 max-w-xs"><FilterSelect label="Jenis" value={type} onChange={(v) => set({ jenis: v })} options={TYPES} /></div>
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={(q.data?.items.length ?? 0) === 0}
          emptyIcon={FileText} emptyTitle="Belum ada laporan" emptyDescription="Laporan akan tampil di sini setelah dipublikasikan.">
          <ul className="space-y-4">
            {q.data?.items.map((r) => {
              const url = publicUrl(r.file_path, 'public-docs')
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{TYPE_LABEL[r.report_type] ?? r.report_type}{r.period_label ? ` · ${r.period_label}` : ''}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{r.title}</h3>
                    {r.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.summary}</p>}
                    <p className="mt-1 text-xs text-slate-500">{formatDate(r.created_at)}</p>
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                      <Download className="size-4" /> Unduh PDF
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
          <Pagination page={page} total={q.data?.total ?? 0} pageSize={PAGE_SIZE} onChange={(p) => set({ hal: p })} />
        </QueryBoundary>
      </Container>
    </>
  )
}
