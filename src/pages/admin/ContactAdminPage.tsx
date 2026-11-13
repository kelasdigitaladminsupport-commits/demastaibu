import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, Mail, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { Pagination } from '../../components/ui/Pagination'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { SearchBar } from '../../components/ui/SearchBar'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { formatDateTime } from '../../utils/format'

interface Msg { id: string; name: string; email: string; subject: string; message: string; status: 'new' | 'read' | 'replied' | 'archived'; created_at: string }
const PAGE = 15
const LABEL = { new: 'Baru', read: 'Dibaca', replied: 'Dibalas', archived: 'Diarsipkan' } as const
const CLS = { new: 'bg-amber-100 text-amber-800', read: 'bg-sky-100 text-sky-800', replied: 'bg-emerald-100 text-emerald-800', archived: 'bg-slate-100 text-slate-600' } as const

export function ContactAdminPage() {
  useDocumentTitle('Pesan Kontak — Admin')
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [toDelete, setToDelete] = useState<Msg | null>(null)

  const list = useQuery({
    queryKey: ['admin-contact', page, q, status],
    placeholderData: (p) => p,
    queryFn: async () => {
      let query = supabase.from('contact_messages').select('id, name, email, subject, message, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      if (status) query = query.eq('status', status)
      if (q) query = query.ilike('subject', `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as Msg[], total: count ?? 0 }
    },
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-contact'] }); qc.invalidateQueries({ queryKey: ['admin-stat'] }) }

  const setStatusM = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: Msg['status'] }) => {
      const { error } = await supabase.from('contact_messages').update({ status: s }).eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh, onError: (e) => toast.error(describeDbError(e)),
  })
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('contact_messages').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Pesan dihapus.'); setToDelete(null); refresh() },
    onError: (e) => { toast.error(describeDbError(e)); setToDelete(null) },
  })

  const rows = list.data?.rows ?? []
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Pesan Kontak</h1>
      <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
        <SearchBar value={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Cari subjek pesan" />
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={Object.entries(LABEL).map(([value, label]) => ({ value, label }))} />
      </div>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={Inbox} emptyTitle="Belum ada pesan">
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-xl border border-slate-200 bg-white">
              <details onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && m.status === 'new') setStatusM.mutate({ id: m.id, s: 'read' }) }}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLS[m.status]}`}>{LABEL[m.status]}</span>
                  <span className="font-medium text-slate-900">{m.subject}</span>
                  <span className="text-sm text-slate-500">{m.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDateTime(m.created_at)}</span>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-4">
                  <p className="text-sm text-slate-500">{m.name} · {m.email}</p>
                  <p className="whitespace-pre-line break-words text-sm text-slate-800">{m.message}</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} onClick={() => m.status !== 'replied' && setStatusM.mutate({ id: m.id, s: 'replied' })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"><Mail className="size-4" /> Balas lewat email</a>
                    {m.status !== 'archived' && <Button size="sm" variant="outline" onClick={() => setStatusM.mutate({ id: m.id, s: 'archived' })}>Arsipkan</Button>}
                    {m.status === 'archived' && <Button size="sm" variant="outline" onClick={() => setStatusM.mutate({ id: m.id, s: 'read' })}>Keluarkan dari arsip</Button>}
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setToDelete(m)}><Trash2 className="size-4" /> Hapus</Button>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <Pagination page={page} total={list.data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
      </QueryBoundary>
      <ConfirmDialog open={toDelete !== null} danger loading={del.isPending} title="Hapus pesan ini?" description="Pesan dihapus permanen." confirmLabel="Ya, hapus"
        onCancel={() => setToDelete(null)} onConfirm={() => toDelete && del.mutate(toDelete.id)} />
    </div>
  )
}
