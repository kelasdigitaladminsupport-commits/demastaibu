import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Flag, MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { Pagination } from '../../components/ui/Pagination'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { SearchBar } from '../../components/ui/SearchBar'
import { ResourceManager } from '../../features/admin/ResourceManager'
import { RESOURCES } from '../../features/admin/resources'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { fetchAuthorNames } from '../../services/forum'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

type Tab = 'laporan' | 'topik' | 'kategori'
const PAGE = 15

interface ReportRow {
  id: string; reporter_id: string; topic_id: string | null; comment_id: string | null; reason: string; status: string; created_at: string
  topic: { id: string; title: string; status: string } | null
  comment: { id: string; content: string; is_hidden: boolean; topic_id: string } | null
}

function Reports() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('open')

  const list = useQuery({
    queryKey: ['admin-forum-reports', page, status],
    placeholderData: (p) => p,
    queryFn: async () => {
      let query = supabase.from('forum_reports')
        .select('id, reporter_id, topic_id, comment_id, reason, status, created_at, topic:forum_topics(id, title, status), comment:forum_comments(id, content, is_hidden, topic_id)', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      if (status) query = query.eq('status', status)
      const { data, error, count } = await query
      if (error) throw error
      const rows = (data ?? []) as unknown as ReportRow[]
      return { rows, total: count ?? 0, names: await fetchAuthorNames(rows.map((r) => r.reporter_id)) }
    },
  })

  const act = useMutation({
    mutationFn: async ({ r, kind }: { r: ReportRow; kind: 'hide' | 'resolve' | 'dismiss' }) => {
      if (kind === 'hide') {
        const res = r.topic_id
          ? await supabase.from('forum_topics').update({ status: 'hidden' }).eq('id', r.topic_id)
          : await supabase.from('forum_comments').update({ is_hidden: true }).eq('id', r.comment_id as string)
        if (res.error) throw res.error
      }
      const { error } = await supabase.from('forum_reports').update({ status: kind === 'dismiss' ? 'dismissed' : 'resolved', handled_by: user?.id }).eq('id', r.id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      toast.success(v.kind === 'hide' ? 'Konten disembunyikan dan laporan diselesaikan.' : v.kind === 'resolve' ? 'Laporan diselesaikan.' : 'Laporan diabaikan.')
      qc.invalidateQueries({ queryKey: ['admin-forum-reports'] }); qc.invalidateQueries({ queryKey: ['admin-stat'] }); qc.invalidateQueries({ queryKey: ['forum-topics'] }); qc.invalidateQueries({ queryKey: ['forum-thread'] })
    },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const rows = list.data?.rows ?? []
  return (
    <div className="space-y-5">
      <div className="max-w-xs">
        <FilterSelect label="Status" allLabel="Semua" value={status} onChange={(v) => { setStatus(v); setPage(1) }}
          options={[{ value: 'open', label: 'Terbuka' }, { value: 'resolved', label: 'Diselesaikan' }, { value: 'dismissed', label: 'Diabaikan' }]} />
      </div>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={Flag} emptyTitle="Tidak ada laporan">
        <ul className="space-y-3">
          {rows.map((r) => {
            const topicId = r.topic_id ?? r.comment?.topic_id
            return (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className={cn('rounded-full px-2 py-0.5 font-semibold', r.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>{r.status === 'open' ? 'Terbuka' : r.status === 'resolved' ? 'Diselesaikan' : 'Diabaikan'}</span>
                  {r.topic_id ? 'Topik' : 'Komentar'} · dilaporkan oleh {list.data?.names[r.reporter_id] ?? 'Pengguna'} · {formatDateTime(r.created_at)}
                </p>
                <p className="mt-2 text-sm"><strong>Alasan:</strong> {r.reason}</p>
                <blockquote className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {r.topic ? r.topic.title : r.comment ? r.comment.content : 'Konten sudah dihapus.'}
                  {(r.topic?.status === 'hidden' || r.comment?.is_hidden) && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">sudah disembunyikan</span>}
                </blockquote>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topicId && <Link to={`/forum/topik/${topicId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"><ExternalLink className="size-4" /> Buka</Link>}
                  {r.status === 'open' && (
                    <>
                      {(r.topic || r.comment) && <Button size="sm" variant="danger" loading={act.isPending && act.variables?.r.id === r.id} onClick={() => act.mutate({ r, kind: 'hide' })}>Sembunyikan konten</Button>}
                      <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ r, kind: 'resolve' })}>Tandai selesai</Button>
                      <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ r, kind: 'dismiss' })}>Abaikan</Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <Pagination page={page} total={list.data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
      </QueryBoundary>
    </div>
  )
}

function Topics() {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')

  const list = useQuery({
    queryKey: ['admin-forum-topics', page, q, filter],
    placeholderData: (p) => p,
    queryFn: async () => {
      let query = supabase.from('forum_topics').select('id, title, status, is_pinned, is_evaluation_material, created_at, category:forum_categories(name)', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      if (q) query = query.ilike('title', `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
      if (filter === 'evaluation') query = query.eq('is_evaluation_material', true)
      else if (filter) query = query.eq('status', filter)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as Array<{ id: string; title: string; status: string; is_pinned: boolean; is_evaluation_material: boolean; created_at: string; category: { name: string } | null }>, total: count ?? 0 }
    },
  })
  const rows = list.data?.rows ?? []
  const label: Record<string, string> = { open: 'Terbuka', closed: 'Ditutup', hidden: 'Disembunyikan' }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
        <SearchBar value={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Cari judul topik" />
        <FilterSelect label="Tampilkan" value={filter} onChange={(v) => { setFilter(v); setPage(1) }}
          options={[{ value: 'open', label: 'Terbuka' }, { value: 'closed', label: 'Ditutup' }, { value: 'hidden', label: 'Disembunyikan' }, { value: 'evaluation', label: 'Bahan evaluasi' }]} />
      </div>
      <p className="text-xs text-slate-500">Buka sebuah topik untuk menutup, menyematkan, menandai bahan evaluasi, atau menyembunyikannya melalui panel moderator.</p>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={MessagesSquare} emptyTitle="Tidak ada topik">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Topik</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Dibuat</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3"><Link to={`/forum/topik/${t.id}`} className="font-medium text-emerald-800 hover:underline">{t.title}</Link></td>
                  <td className="px-4 py-3">{t.category?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className="text-slate-700">{label[t.status] ?? t.status}</span>
                    {t.is_pinned && <span className="ml-2 text-xs text-gold-dark">📌</span>}
                    {t.is_evaluation_material && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Evaluasi</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={list.data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
      </QueryBoundary>
    </div>
  )
}

export function ForumAdminPage() {
  useDocumentTitle('Forum & Moderasi — Admin')
  const [tab, setTab] = useState<Tab>('laporan')
  const tabs: Array<{ value: Tab; label: string }> = [{ value: 'laporan', label: 'Laporan' }, { value: 'topik', label: 'Topik' }, { value: 'kategori', label: 'Kategori' }]
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Forum & Moderasi</h1>
      <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === t.value ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{t.label}</button>
        ))}
      </div>
      {tab === 'laporan' && <Reports />}
      {tab === 'topik' && <Topics />}
      {tab === 'kategori' && <ResourceManager key="kategori-forum" config={RESOURCES['kategori-forum']} />}
    </div>
  )
}
