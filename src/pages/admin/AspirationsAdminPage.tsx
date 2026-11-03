import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Inbox, Lock, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, inputClass } from '../../components/ui/Field'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { PageLoading } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { SearchBar } from '../../components/ui/SearchBar'
import { CATEGORIES, CATEGORY_LABEL, STATUSES, STATUS_CLS, STATUS_LABEL } from '../../features/aspirations/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { formatDateTime } from '../../utils/format'
import { ROLES_ADMIN } from '../../utils/roles'

interface Asp {
  id: string; ticket_code: string; user_id: string | null; category: string; title: string; content: string
  is_anonymous: boolean; submitter_name: string | null; submitter_contact: string | null; attachment_path: string | null
  status: string; status_reason: string | null; public_response: string | null; is_public: boolean
  assigned_to: string | null; created_at: string; updated_at: string
}
interface Upd { id: string; author_id: string | null; note: string; status_to: string | null; is_internal: boolean; created_at: string }
const PAGE = 15

function useStaff() {
  return useQuery({
    queryKey: ['staff-directory'], staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_assignable_staff')
      if (error) throw error
      return (data ?? []) as Array<{ id: string; name: string }>
    },
  })
}

const Badge = ({ status }: { status: string }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[status] ?? ''}`}>{STATUS_LABEL[status] ?? status}</span>
)

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const { user, hasRole } = useAuth()
  const qc = useQueryClient()
  const staff = useStaff()
  const [confirmDel, setConfirmDel] = useState(false)
  const [note, setNote] = useState('')
  const [noteInternal, setNoteInternal] = useState(true)
  const [signed, setSigned] = useState<string | null>(null)

  const asp = useQuery({
    queryKey: ['admin-asp', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('aspirations').select('*').eq('id', id).single()
      if (error) throw error
      return data as unknown as Asp
    },
  })
  const updates = useQuery({
    queryKey: ['admin-asp-updates', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('aspiration_updates')
        .select('id, author_id, note, status_to, is_internal, created_at').eq('aspiration_id', id).order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Upd[]
    },
  })

  const a = asp.data
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm({
    defaultValues: { status: 'received', status_reason: '', public_response: '', is_public: false, assigned_to: '' },
  })
  useEffect(() => {
    if (a) reset({ status: a.status, status_reason: a.status_reason ?? '', public_response: a.public_response ?? '', is_public: a.is_public, assigned_to: a.assigned_to ?? '' })
  }, [a, reset])

  useEffect(() => {
    setSigned(null)
    if (!a?.attachment_path) return
    supabase.storage.from('aspiration-attachments').createSignedUrl(a.attachment_path, 300).then(({ data }) => setSigned(data?.signedUrl ?? null))
  }, [a?.attachment_path])

  const nameOf = (uid: string | null) => (uid ? staff.data?.find((s) => s.id === uid)?.name ?? 'Staf' : 'Sistem')
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-asp', id] }); qc.invalidateQueries({ queryKey: ['admin-asp-updates', id] })
    qc.invalidateQueries({ queryKey: ['admin-aspirations'] }); qc.invalidateQueries({ queryKey: ['public-aspirations'] }); qc.invalidateQueries({ queryKey: ['admin-stat'] })
  }

  async function save(v: { status: string; status_reason: string; public_response: string; is_public: boolean; assigned_to: string }) {
    if (!a) return
    if (v.status === 'rejected' && !v.status_reason.trim()) { toast.error('Isi alasan bila aspirasi tidak dapat ditindaklanjuti.'); return }
    try {
      const { error } = await supabase.from('aspirations').update({
        status: v.status, status_reason: v.status_reason.trim() || null, public_response: v.public_response.trim() || null,
        is_public: v.is_public, assigned_to: v.assigned_to || null,
      }).eq('id', id)
      if (error) throw error
      if (v.status !== a.status) {
        const r = await supabase.from('aspiration_updates').insert({
          aspiration_id: id, author_id: user?.id, note: `Status diubah menjadi “${STATUS_LABEL[v.status]}”.`, status_to: v.status, is_internal: false,
        })
        if (r.error) throw r.error
      }
      toast.success('Perubahan disimpan.'); refresh()
    } catch (e) { toast.error(describeDbError(e)) }
  }

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('aspiration_updates').insert({ aspiration_id: id, author_id: user?.id, note: note.trim(), is_internal: noteInternal })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Catatan ditambahkan.'); setNote(''); setNoteInternal(true); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('aspirations').delete().eq('id', id)
      if (error) throw error
      if (a?.attachment_path) { try { await supabase.storage.from('aspiration-attachments').remove([a.attachment_path]) } catch { /* abaikan */ } }
    },
    onSuccess: () => { toast.success('Aspirasi dihapus.'); refresh(); onBack() },
    onError: (e) => { toast.error(describeDbError(e)); setConfirmDel(false) },
  })

  if (asp.isLoading) return <PageLoading />
  if (!a) return <p className="text-sm text-red-600">Aspirasi tidak dapat dimuat.</p>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="size-4" /> Kembali ke daftar</button>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="font-mono text-sm text-slate-500">{a.ticket_code} · {CATEGORY_LABEL[a.category] ?? a.category} · {formatDateTime(a.created_at)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-emerald-950">{a.title}</h1>
        <p className="mt-2"><Badge status={a.status} /></p>
        <p className="mt-4 whitespace-pre-line break-words text-slate-800">{a.content}</p>
        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase text-slate-400">Pengirim</dt>
            <dd>{a.is_anonymous ? 'Anonim' : (a.submitter_name || 'Tanpa nama')}{!a.is_anonymous && a.user_id && ' (akun terdaftar)'}</dd></div>
          {!a.is_anonymous && a.submitter_contact && <div><dt className="text-xs font-semibold uppercase text-slate-400">Kontak</dt><dd>{a.submitter_contact}</dd></div>}
          {a.attachment_path && <div><dt className="text-xs font-semibold uppercase text-slate-400">Lampiran</dt>
            <dd>{signed ? <a href={signed} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:underline"><Paperclip className="size-4" /> Buka lampiran</a> : 'Memuat…'}</dd></div>}
        </dl>
        {a.is_anonymous && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Kiriman anonim: jangan berupaya melacak identitas pengirim.</p>}
      </div>

      <form onSubmit={handleSubmit(save)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Penanganan</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <select id="status" className={inputClass} {...register('status')}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </Field>
          <Field label="Penanggung jawab" htmlFor="assigned_to">
            <select id="assigned_to" className={inputClass} {...register('assigned_to')}>
              <option value="">— Belum ditetapkan —</option>
              {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Alasan / keterangan status" htmlFor="status_reason" error={errors.status_reason?.message} hint="Wajib bila status “Tidak dapat ditindaklanjuti”. Ditampilkan kepada pengirim.">
          <textarea id="status_reason" rows={2} className={inputClass} {...register('status_reason')} />
        </Field>
        <Field label="Tanggapan publik" htmlFor="public_response" hint="Terlihat oleh pengirim lewat kode tiket dan, bila dipublikasikan, oleh semua pengunjung.">
          <textarea id="public_response" rows={4} className={inputClass} {...register('public_response')} />
        </Field>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 rounded border-slate-300 text-emerald-700" {...register('is_public')} />
          <span className="text-sm"><span className="font-medium text-slate-800">Tampilkan di halaman Aspirasi Publik</span>
            <span className="block text-xs text-slate-500">Judul, isi, dan tanggapan akan tampil tanpa identitas pengirim. Pastikan isinya tidak memuat data pribadi.</span></span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {hasRole(...ROLES_ADMIN) ? <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Hapus aspirasi</Button> : <span />}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Simpan perubahan</Button>
        </div>
      </form>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Riwayat tindak lanjut</h2>
        {updates.isLoading ? <PageLoading /> : (updates.data?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Belum ada riwayat.</p> : (
          <ol className="space-y-3 border-l-2 border-emerald-200 pl-4">
            {updates.data?.map((u) => (
              <li key={u.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {formatDateTime(u.created_at)} · {nameOf(u.author_id)}
                  {u.is_internal ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"><Lock className="size-3" /> Internal</span>
                    : <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">Terlihat pengirim</span>}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-slate-800">{u.note}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={3000} placeholder="Tulis catatan tindak lanjut…" aria-label="Catatan tindak lanjut" className={inputClass} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={noteInternal} onChange={(e) => setNoteInternal(e.target.checked)} className="size-4 rounded border-slate-300 text-emerald-700" />
              Catatan internal (tidak terlihat publik/pengirim)
            </label>
            <Button loading={addNote.isPending} disabled={!note.trim()} onClick={() => addNote.mutate()}>Tambah catatan</Button>
          </div>
        </div>
      </section>

      <ConfirmDialog open={confirmDel} danger loading={del.isPending} title="Hapus aspirasi ini?" description="Aspirasi, riwayat, dan lampirannya dihapus permanen." confirmLabel="Ya, hapus"
        onCancel={() => setConfirmDel(false)} onConfirm={() => del.mutate()} />
    </div>
  )
}

export function AspirationsAdminPage() {
  useDocumentTitle('Aspirasi — Admin')
  const [openId, setOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const staff = useStaff()

  const list = useQuery({
    queryKey: ['admin-aspirations', page, q, status, category],
    placeholderData: (p) => p,
    queryFn: async () => {
      let query = supabase.from('aspirations').select('id, ticket_code, title, category, status, assigned_to, created_at, is_anonymous', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      if (status) query = query.eq('status', status)
      if (category) query = query.eq('category', category)
      if (q) query = /^ASP-/i.test(q) ? query.eq('ticket_code', q.toUpperCase()) : query.ilike('title', `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as Array<Asp>, total: count ?? 0 }
    },
  })

  if (openId) return <Detail id={openId} onBack={() => setOpenId(null)} />
  const rows = list.data?.rows ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Aspirasi</h1>
      <div className="grid gap-3 md:grid-cols-[1fr_14rem_14rem]">
        <SearchBar value={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Cari judul atau kode tiket (ASP-…)" />
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        <FilterSelect label="Kategori" value={category} onChange={(v) => { setCategory(v); setPage(1) }} options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
      </div>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={Inbox} emptyTitle="Belum ada aspirasi">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Aspirasi</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">PJ</th><th className="px-4 py-3">Masuk</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(r.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left font-medium text-emerald-800 hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id) }}>{r.title}</button>
                    <p className="font-mono text-xs text-slate-400">{r.ticket_code}</p></td>
                  <td className="px-4 py-3">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                  <td className="px-4 py-3"><Badge status={r.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.assigned_to ? staff.data?.find((s) => s.id === r.assigned_to)?.name ?? 'Staf' : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(r.created_at)}</td>
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
