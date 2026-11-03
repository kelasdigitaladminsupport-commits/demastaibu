import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Avatar } from '../../components/ui/Avatar'
import { PeriodSelect } from '../../components/PeriodSelect'
import { useOfficersByPeriod } from '../../features/officers/useOfficers'
import { fetchDepartments } from '../../services/content'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function DepartmentsPage() {
  useDocumentTitle('Bidang dan Anggota')
  const deps = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })
  const { query, periods, period, officers, setPeriod } = useOfficersByPeriod()

  const isLoading = deps.isLoading || query.isLoading
  const error = deps.error ?? query.error
  const list = deps.data ?? []

  return (
    <>
      <PageHeader title="Bidang dan Anggota" description="Pembagian bidang kerja beserta anggotanya." />
      <Container className="space-y-6">
        <QueryBoundary isLoading={isLoading} error={error} onRetry={() => { deps.refetch(); query.refetch() }} isEmpty={list.length === 0}
          emptyTitle="Bidang belum diisi" emptyDescription="Data bidang belum dipublikasikan.">
          <PeriodSelect periods={periods} value={period} onChange={setPeriod} />
          {list.map((d) => {
            const members = officers
              .filter((o) => o.department?.id === d.id)
              .sort((a, b) => a.position.level - b.position.level || a.sort_order - b.sort_order)
            return (
              <details key={d.id} className="group rounded-2xl border border-slate-200 bg-white" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-emerald-950">{d.name}</h2>
                    {d.description && <p className="mt-1 text-sm text-slate-600">{d.description}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{members.length} orang</span>
                </summary>
                <div className="border-t border-slate-100 p-5">
                  {members.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada anggota yang dipublikasikan.</p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center gap-3">
                          <Avatar path={m.photo_path} name={m.full_name} className="size-11 shrink-0 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{m.full_name}</p>
                            <p className="truncate text-xs text-slate-500">{m.position.title}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            )
          })}
        </QueryBoundary>
      </Container>
    </>
  )
}
