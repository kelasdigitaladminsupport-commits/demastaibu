import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Inbox, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { ResourceForm } from './ResourceForm'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { removeFiles } from '../../services/adminStorage'
import { describeDbError } from '../../services/adminErrors'
import type { ResourceConfig, Row } from './types'

const PAGE = 15
type View = { kind: 'list' } | { kind: 'form'; id: string | null } | { kind: 'panel'; row: Row }

export function ResourceManager({ config }: { config: ResourceConfig }) {
  useDocumentTitle(`${config.title} — Admin`)
  const { user } = useAuth()
  const qc = useQueryClient()
  const [view, setView] = useState<View>({ kind: 'list' })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [toDelete, setToDelete] = useState<Row | null>(null)

  const list = useQuery({
    queryKey: ['admin', config.table, page, q],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase.from(config.table).select(config.select, { count: 'exact' })
        .order(config.orderBy.column, { ascending: config.orderBy.ascending })
        .range((page - 1) * PAGE, page * PAGE - 1)
      if (q) query = query.ilike(config.searchField, `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as Row[], total: count ?? 0 }
    },
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin', config.table] })
    qc.invalidateQueries({ queryKey: ['admin-row', config.table] })
    for (const k of config.publicKeys) qc.invalidateQueries({ queryKey: [k] })
  }

  const del = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(config.table).delete().eq('id', row.id)
      if (error) throw error
      // hapus berkas terkait (upaya terbaik)
      for (const f of config.fields) {
        if (f.type === 'image' || f.type === 'pdf') await removeFiles(f.bucket, [row[f.name] as string | null])
      }
    },
    onSuccess: () => { toast.success(`${config.singular} dihapus.`); setToDelete(null); refresh() },
    onError: (e) => { toast.error(describeDbError(e)); setToDelete(null) },
  })

  if (view.kind === 'form') {
    return (
      <ResourceForm config={config} id={view.id} userId={user?.id ?? ''}
        onDone={() => { refresh(); setView({ kind: 'list' }) }} onCancel={() => setView({ kind: 'list' })} />
    )
  }

  if (view.kind === 'panel' && config.extraAction) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button type="button" onClick={() => setView({ kind: 'list' })} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline">
          <ArrowLeft className="size-4" /> Kembali ke daftar
        </button>
        {config.extraAction.render(view.row, () => { refresh(); setView({ kind: 'list' }) })}
      </div>
    )
  }

  const rows = list.data?.rows ?? []
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-emerald-950">{config.title}</h1>
        <Button onClick={() => setView({ kind: 'form', id: null })}><Plus className="size-4" /> Tambah {config.singular}</Button>
      </div>

      <div className="max-w-sm"><SearchBar value={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder={`Cari ${config.singular.toLowerCase()}`} /></div>

      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0}
        emptyIcon={Inbox} emptyTitle={q ? 'Tidak ditemukan' : `Belum ada ${config.singular.toLowerCase()}`}
        emptyDescription={q ? 'Coba kata kunci lain.' : `Klik “Tambah ${config.singular}” untuk membuat yang pertama.`}>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {config.columns.map((c) => <th key={c.header} className="px-4 py-3 font-semibold">{c.header}</th>)}
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  {config.columns.map((c) => <td key={c.header} className="px-4 py-3 align-top">{c.cell(row)}</td>)}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {config.extraAction && (
                      <Button variant="ghost" size="sm" onClick={() => setView({ kind: 'panel', row })}>{config.extraAction.label}</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setView({ kind: 'form', id: row.id })} aria-label={`Ubah ${config.singular}`}><Pencil className="size-4" /> Ubah</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setToDelete(row)} aria-label={`Hapus ${config.singular}`}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={list.data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
      </QueryBoundary>

      <ConfirmDialog open={toDelete !== null} danger loading={del.isPending}
        title={`Hapus ${config.singular.toLowerCase()} ini?`}
        description="Tindakan ini tidak dapat dibatalkan. Berkas terkait ikut dihapus."
        confirmLabel="Ya, hapus" onCancel={() => setToDelete(null)} onConfirm={() => toDelete && del.mutate(toDelete)} />
    </div>
  )
}
