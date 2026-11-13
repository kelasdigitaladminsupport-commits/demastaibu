import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Handshake, Lock, Mail, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, inputClass } from '../../components/ui/Field'
import { FilterSelect } from '../../components/ui/FilterSelect'
import { PageLoading } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { SearchBar } from '../../components/ui/SearchBar'
import { ResourceManager } from '../../features/admin/ResourceManager'
import { RESOURCES } from '../../features/admin/resources'
import { PARTNER_STATUSES, PARTNER_STATUS_CLS, PARTNER_STATUS_LABEL, PARTNER_TYPES, PARTNER_TYPE_LABEL } from '../../features/partnerships/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { cn } from '../../utils/cn'
import { formatDateTime, formatRupiah } from '../../utils/format'

interface Req {
  id: string; reference_no: string; org_name: string; contact_person: string; email: string; phone: string | null
  partner_type: string; cooperation_type: string; supported_program: string | null; support_form: string | null
  support_value: number | null; message: string; proposal_path: string | null; status: string
  publish_consent: boolean; assigned_to: string | null; created_at: string; updated_at: string
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
const Badge = ({ status }: { status: string }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PARTNER_STATUS_CLS[status] ?? ''}`}>{PARTNER_STATUS_LABEL[status] ?? status}</span>

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const staff = useStaff()
  const [confirmDel, setConfirmDel] = useState(false)
  const [note, setNote] = useState('')
  const [noteInternal, setNoteInternal] = useState(true)
  const [signed, setSigned] = useState<string | null>(null)

  const req = useQuery({
    queryKey: ['admin-partner', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('partnership_requests').select('*').eq('id', id).single()
      if (error) throw error
      return data as unknown as Req
    },
  })
  const updates = useQuery({
    queryKey: ['admin-partner-updates', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('partnership_updates').select('id, author_id, note, status_to, is_internal, created_at').eq('request_id', id).order('created_at')
      if (error) throw error
      return (data ?? []) as unknown as Upd[]
    },
  })
  const linked = useQuery({
    queryKey: ['admin-partner-sponsor', id],
    queryFn: async () => {
      const { count, error } = await supabase.from('sponsors').select('id', { count: 'exact', head: true }).eq('request_id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
  })

  const r = req.data
  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm({ defaultValues: { status: 'received', assigned_to: '' } })
  useEffect(() => { if (r) reset({ status: r.status, assigned_to: r.assigned_to ?? '' }) }, [r, reset])
  useEffect(() => {
    setSigned(null)
    if (!r?.proposal_path) return
    supabase.storage.from('partnership-proposals').createSignedUrl(r.proposal_path, 300).then(({ data }) => setSigned(data?.signedUrl ?? null))
  }, [r?.proposal_path])

  const nameOf = (uid: string | null) => (uid ? staff.data?.find((s) => s.id === uid)?.name ?? 'Staf' : 'Sistem')
  const refresh = () => {
    for (const k of ['admin-partner', 'admin-partner-updates', 'admin-partner-sponsor', 'admin-partnerships', 'admin-stat', 'admin-rel']) qc.invalidateQueries({ queryKey: [k] })
  }

  async function save(v: { status: string; assigned_to: string }) {
    if (!r) return
    try {
      const { error } = await supabase.from('partnership_requests').update({ status: v.status, assigned_to: v.assigned_to || null }).eq('id', id)
      if (error) throw error
      if (v.status !== r.status) {
        const u = await supabase.from('partnership_updates').insert({ request_id: id, author_id: user?.id, note: `Status diubah menjadi “${PARTNER_STATUS_LABEL[v.status]}”.`, status_to: v.status, is_internal: false })
        if (u.error) throw u.error
      }
      toast.success('Perubahan disimpan.'); refresh()
    } catch (e) { toast.error(describeDbError(e)) }
  }

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('partnership_updates').insert({ request_id: id, author_id: user?.id, note: note.trim(), is_internal: noteInternal })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Catatan ditambahkan.'); setNote(''); setNoteInternal(true); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const makeSponsor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sponsors').insert({ name: r?.org_name, request_id: id, is_published: false })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Draf sponsor dibuat. Lengkapi logo dan deskripsi di tab Sponsor.'); qc.invalidateQueries({ queryKey: ['admin', 'sponsors'] }); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('partnership_requests').delete().eq('id', id)
      if (error) throw error
      if (r?.proposal_path) { try { await supabase.storage.from('partnership-proposals').remove([r.proposal_path]) } catch { /* abaikan */ } }
    },
    onSuccess: () => { toast.success('Permohonan dihapus.'); refresh(); onBack() },
    onError: (e) => { toast.error(describeDbError(e)); setConfirmDel(false) },
  })

  if (req.isLoading) return <PageLoading />
  if (!r) return <p className="text-sm text-red-600">Permohonan tidak dapat dimuat.</p>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="size-4" /> Kembali ke daftar</button>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="font-mono text-sm text-slate-500">{r.reference_no} · {PARTNER_TYPE_LABEL[r.partner_type] ?? r.partner_type} · {formatDateTime(r.created_at)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-emerald-950">{r.org_name}</h1>
        <p className="mt-2"><Badge status={r.status} /></p>
        <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase text-slate-400">Narahubung</dt><dd>{r.contact_person}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-slate-400">Email</dt><dd><a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: Permohonan kerja sama ${r.reference_no}`)}`} className="inline-flex items-center gap-1 text-emerald-800 hover:underline"><Mail className="size-4" /> {r.email}</a></dd></div>
          {r.phone && <div><dt className="text-xs font-semibold uppercase text-slate-400">Telepon</dt><dd>{r.phone}</dd></div>}
          <div><dt className="text-xs font-semibold uppercase text-slate-400">Jenis kerja sama</dt><dd>{r.cooperation_type}</dd></div>
          {r.supported_program && <div><dt className="text-xs font-semibold uppercase text-slate-400">Program didukung</dt><dd>{r.supported_program}</dd></div>}
          {r.support_form && <div><dt className="text-xs font-semibold uppercase text-slate-400">Bentuk bantuan</dt><dd>{r.support_form}</dd></div>}
          {r.support_value != null && <div><dt className="text-xs font-semibold uppercase text-slate-400">Perkiraan nilai</dt><dd>{formatRupiah(r.support_value)}</dd></div>}
          <div><dt className="text-xs font-semibold uppercase text-slate-400">Izin publikasi</dt><dd>{r.publish_consent ? <span className="font-semibold text-emerald-700">Diizinkan</span> : 'Tidak diizinkan'}</dd></div>
          {r.proposal_path && <div><dt className="text-xs font-semibold uppercase text-slate-400">Proposal</dt><dd>{signed ? <a href={signed} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:underline"><Paperclip className="size-4" /> Buka PDF</a> : 'Memuat…'}</dd></div>}
        </dl>
        <p className="mt-5 whitespace-pre-line break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-800">{r.message}</p>
      </div>

      <form onSubmit={handleSubmit(save)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Penanganan</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="status"><select id="status" className={inputClass} {...register('status')}>{PARTNER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          <Field label="Penanggung jawab" htmlFor="assigned_to"><select id="assigned_to" className={inputClass} {...register('assigned_to')}><option value="">— Belum ditetapkan —</option>{staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Hapus</Button>
            {r.status === 'agreed' && r.publish_consent && !linked.data && (
              <Button variant="outline" loading={makeSponsor.isPending} onClick={() => makeSponsor.mutate()}><Handshake className="size-4" /> Jadikan sponsor (draf)</Button>
            )}
            {linked.data && <span className="self-center text-xs text-emerald-700">Sudah terhubung ke daftar sponsor.</span>}
          </div>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Simpan perubahan</Button>
        </div>
      </form>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Riwayat tindak lanjut</h2>
        {updates.isLoading ? <PageLoading /> : (updates.data?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Belum ada riwayat.</p> : (
          <ol className="space-y-3 border-l-2 border-emerald-200 pl-4">
            {updates.data?.map((u) => (
              <li key={u.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">{formatDateTime(u.created_at)} · {nameOf(u.author_id)}
                  {u.is_internal ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"><Lock className="size-3" /> Internal</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">Terlihat pemohon</span>}</p>
                <p className="mt-0.5 whitespace-pre-line text-slate-800">{u.note}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={3000} placeholder="Tulis catatan tindak lanjut…" aria-label="Catatan tindak lanjut" className={inputClass} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={noteInternal} onChange={(e) => setNoteInternal(e.target.checked)} className="size-4 rounded border-slate-300 text-emerald-700" /> Catatan internal (tidak terlihat pemohon)</label>
            <Button loading={addNote.isPending} disabled={!note.trim()} onClick={() => addNote.mutate()}>Tambah catatan</Button>
          </div>
        </div>
      </section>

      <ConfirmDialog open={confirmDel} danger loading={del.isPending} title="Hapus permohonan ini?" description="Permohonan, riwayat, dan proposalnya dihapus permanen. Sponsor yang terhubung tidak ikut terhapus." confirmLabel="Ya, hapus"
        onCancel={() => setConfirmDel(false)} onConfirm={() => del.mutate()} />
    </div>
  )
}

function Requests() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [ptype, setPtype] = useState('')

  const list = useQuery({
    queryKey: ['admin-partnerships', page, q, status, ptype],
    placeholderData: (p) => p,
    queryFn: async () => {
      let query = supabase.from('partnership_requests').select('id, reference_no, org_name, partner_type, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      if (status) query = query.eq('status', status)
      if (ptype) query = query.eq('partner_type', ptype)
      if (q) query = /^KRJ-/i.test(q) ? query.eq('reference_no', q.toUpperCase()) : query.ilike('org_name', `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as Req[], total: count ?? 0 }
    },
  })
  if (openId) return <Detail id={openId} onBack={() => setOpenId(null)} />
  const rows = list.data?.rows ?? []
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_14rem_14rem]">
        <SearchBar value={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Cari nama lembaga atau nomor (KRJ-…)" />
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={PARTNER_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        <FilterSelect label="Jenis mitra" value={ptype} onChange={(v) => { setPtype(v); setPage(1) }} options={PARTNER_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
      </div>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={Handshake} emptyTitle="Belum ada permohonan">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Pemohon</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Masuk</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(r.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left font-medium text-emerald-800 hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id) }}>{r.org_name}</button><p className="font-mono text-xs text-slate-400">{r.reference_no}</p></td>
                  <td className="px-4 py-3">{PARTNER_TYPE_LABEL[r.partner_type] ?? r.partner_type}</td>
                  <td className="px-4 py-3"><Badge status={r.status} /></td>
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

export function PartnershipsAdminPage() {
  useDocumentTitle('Sponsorship & Mitra — Admin')
  const [tab, setTab] = useState<'permohonan' | 'sponsor'>('permohonan')
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Sponsorship & Mitra</h1>
      <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
        {([['permohonan', 'Permohonan'], ['sponsor', 'Sponsor ditampilkan']] as const).map(([v, l]) => (
          <button key={v} role="tab" type="button" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === v ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{l}</button>
        ))}
      </div>
      {tab === 'permohonan' ? <Requests /> : <ResourceManager key="sponsor" config={RESOURCES.sponsor} />}
    </div>
  )
}
