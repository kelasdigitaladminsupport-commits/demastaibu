import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../utils/format'

interface Log {
  id: number; actor_id: string | null; action: 'INSERT' | 'UPDATE' | 'DELETE'; table_name: string
  record_id: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string
}
const PAGE = 20
const TABLES = ['news', 'events', 'programs', 'officers', 'departments', 'galleries', 'community_programs', 'public_reports',
  'site_settings', 'user_roles', 'aspirations', 'aspiration_updates', 'partnership_requests', 'sponsors', 'donations',
  'donation_reports', 'pmb_periods', 'study_programs', 'applicants', 'forum_topics', 'forum_comments']
const ACTION_LABEL = { INSERT: 'Tambah', UPDATE: 'Ubah', DELETE: 'Hapus' } as const
const ACTION_CLS = { INSERT: 'bg-emerald-100 text-emerald-800', UPDATE: 'bg-amber-100 text-amber-800', DELETE: 'bg-red-100 text-red-800' } as const

const short = (v: unknown) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 140 ? `${s.slice(0, 140)}…` : s }

/** Ringkas perubahan: hanya kolom yang berubah (UPDATE) atau kolom utama (INSERT/DELETE). */
function summarize(l: Log): Array<[string, string]> {
  if (l.action === 'UPDATE' && l.old_data && l.new_data) {
    return Object.keys(l.new_data)
      .filter((k) => k !== 'updated_at' && JSON.stringify(l.old_data?.[k]) !== JSON.stringify(l.new_data?.[k]))
      .map((k) => [k, `${short(l.old_data?.[k]) ?? '∅'}  →  ${short(l.new_data?.[k]) ?? '∅'}`])
  }
  const d = l.new_data ?? l.old_data ?? {}
  return Object.entries(d).filter(([, v]) => v !== null && v !== '').slice(0, 8).map(([k, v]) => [k, short(v) ?? ''])
}

export function AuditLogPage() {
  useDocumentTitle('Log Aktivitas — Admin')
  const [page, setPage] = useState(1)
  const [table, setTable] = useState('')
  const [action, setAction] = useState('')

  const q = useQuery({
    queryKey: ['admin-audit', page, table, action],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase.from('audit_logs').select('id, actor_id, action, table_name, record_id, old_data, new_data, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      if (table) query = query.eq('table_name', table)
      if (action) query = query.eq('action', action)
      const { data, error, count } = await query
      if (error) throw error
      const logs = (data ?? []) as unknown as Log[]
      const ids = Array.from(new Set(logs.map((l) => l.actor_id).filter((x): x is string => Boolean(x))))
      const actors: Record<string, string> = {}
      if (ids.length) {
        const r = await supabase.from('profiles').select('id, email, full_name').in('id', ids)
        for (const p of (r.data ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>) actors[p.id] = p.full_name || p.email || p.id
      }
      return { logs, actors, total: count ?? 0 }
    },
  })
  const logs = q.data?.logs ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Log Aktivitas</h1>
      <p className="text-sm text-slate-600">Catatan otomatis perubahan data penting. Dicatat oleh database dan tidak dapat diubah dari website. Data pribadi (pendaftar, aspirasi, kemitraan) hanya dicatat statusnya.</p>
      <div className="grid gap-3 sm:grid-cols-2 md:max-w-xl">
        <FilterSelect label="Tabel" value={table} onChange={(v) => { setTable(v); setPage(1) }} options={TABLES.map((t) => ({ value: t, label: t }))} />
        <FilterSelect label="Aksi" value={action} onChange={(v) => { setAction(v); setPage(1) }} options={Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))} />
      </div>

      <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={logs.length === 0}
        emptyIcon={ScrollText} emptyTitle="Belum ada aktivitas tercatat">
        <ul className="space-y-3">
          {logs.map((l) => {
            const rows = summarize(l)
            return (
              <li key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_CLS[l.action]}`}>{ACTION_LABEL[l.action]}</span>
                  <code className="text-xs font-semibold text-slate-700">{l.table_name}</code>
                  <span className="text-slate-500">oleh {l.actor_id ? (q.data?.actors[l.actor_id] ?? l.actor_id) : 'sistem / publik'}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDateTime(l.created_at)}</span>
                </div>
                {rows.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-emerald-800">Lihat rincian</summary>
                    <dl className="mt-2 space-y-1 text-xs">
                      {rows.map(([k, v]) => (
                        <div key={k} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                          <dt className="font-semibold text-slate-600">{k}</dt>
                          <dd className="break-words text-slate-700">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
        <Pagination page={page} total={q.data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
      </QueryBoundary>
    </div>
  )
}
