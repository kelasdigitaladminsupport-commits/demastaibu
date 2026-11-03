import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, FileText, Lock, ShieldAlert, Trash2, Users } from 'lucide-react'
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
import { APPLICANT_STATUSES, APPLICANT_STATUS_CLS, APPLICANT_STATUS_LABEL, GENDER_LABEL } from '../../features/pmb/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { fetchDocuments, signedDocUrl } from '../../services/pmb'
import { cn } from '../../utils/cn'
import { formatDate, formatDateTime } from '../../utils/format'
import { ROLES_PMB } from '../../utils/roles'

interface Row {
  id: string; registration_no: string; full_name: string; status: string; created_at: string
  birth_place: string | null; birth_date: string | null; gender: string | null; email: string; phone: string | null; address: string | null
  previous_school: string | null; graduation_year: number | null; guardian_name: string | null; guardian_phone: string | null
  period: { name: string; academic_year: string } | null; program: { name: string } | null
}
interface Hist { id: string; status_from: string | null; status_to: string; note_public: string | null; note_internal: string | null; changed_by: string | null; created_at: string }
const PAGE = 15
const COLS = 'id, registration_no, full_name, status, created_at, birth_place, birth_date, gender, email, phone, address, previous_school, graduation_year, guardian_name, guardian_phone, period:pmb_periods(name, academic_year), program:study_programs(name)'
const Badge = ({ status }: { status: string }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${APPLICANT_STATUS_CLS[status] ?? ''}`}>{APPLICANT_STATUS_LABEL[status] ?? status}</span>

interface Filters { q: string; status: string; periodId: string; programId: string }

function applyFilters<T extends { eq: (c: string, v: string) => T; ilike: (c: string, v: string) => T }>(query: T, f: Filters): T {
  let qy = query
  if (f.status) qy = qy.eq('status', f.status)
  if (f.periodId) qy = qy.eq('period_id', f.periodId)
  if (f.programId) qy = qy.eq('program_id', f.programId)
  if (f.q) qy = /^PMB/i.test(f.q) ? qy.eq('registration_no', f.q.toUpperCase()) : qy.ilike('full_name', `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
  return qy
}

/** Cegah formula injection saat CSV dibuka di Excel/Sheets. */
const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [notePublic, setNotePublic] = useState('')
  const [noteInternal, setNoteInternal] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const q = useQuery({
    queryKey: ['admin-applicant', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('applicants').select(COLS).eq('id', id).single()
      if (error) throw error
      return data as unknown as Row
    },
  })
  const hist = useQuery({
    queryKey: ['admin-applicant-hist', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('applicant_status_histories').select('id, status_from, status_to, note_public, note_internal, changed_by, created_at').eq('applicant_id', id).order('created_at')
      if (error) throw error
      return (data ?? []) as unknown as Hist[]
    },
  })
  const docs = useQuery({ queryKey: ['admin-applicant-docs', id], queryFn: () => fetchDocuments(id) })
  const a = q.data
  useEffect(() => { if (a) setStatus(a.status) }, [a])

  const refresh = () => { for (const k of ['admin-applicant', 'admin-applicant-hist', 'admin-applicants', 'admin-stat']) qc.invalidateQueries({ queryKey: [k] }) }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_applicant_status', { p_id: id, p_status: status, p_note_public: notePublic, p_note_internal: noteInternal })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Status dan catatan disimpan.'); setNotePublic(''); setNoteInternal(''); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })
  const del = useMutation({
    mutationFn: async () => {
      const list = docs.data ?? []
      const { error } = await supabase.from('applicants').delete().eq('id', id)
      if (error) throw error
      if (list.length) { try { await supabase.storage.from('pmb-documents').remove(list.map((d) => d.file_path)) } catch { /* abaikan */ } }
    },
    onSuccess: () => { toast.success('Data pendaftar dihapus.'); refresh(); onBack() },
    onError: (e) => { toast.error(describeDbError(e)); setConfirmDel(false) },
  })
  async function openDoc(path: string) {
    const url = await signedDocUrl(path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer'); else toast.error('Tidak dapat membuka dokumen.')
  }

  if (q.isLoading) return <PageLoading />
  if (!a) return <p className="text-sm text-red-600">Data pendaftar tidak dapat dimuat.</p>
  const field = (k: string, v: string | number | null | undefined) => <div key={k}><dt className="text-xs font-semibold uppercase text-slate-400">{k}</dt><dd className="text-sm text-slate-900">{v || '—'}</dd></div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="size-4" /> Kembali ke daftar</button>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="font-mono text-sm text-slate-500">{a.registration_no} · {formatDateTime(a.created_at)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-emerald-950">{a.full_name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2"><Badge status={a.status} /><span className="text-sm text-slate-600">{a.program?.name} · {a.period?.name} ({a.period?.academic_year})</span></p>
        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {field('Tempat lahir', a.birth_place)}{field('Tanggal lahir', a.birth_date ? formatDate(a.birth_date) : null)}{field('Jenis kelamin', a.gender ? GENDER_LABEL[a.gender] : null)}
          {field('Email', a.email)}{field('Telepon', a.phone)}{field('Asal sekolah', a.previous_school)}{field('Tahun lulus', a.graduation_year)}
          {field('Orang tua/wali', a.guardian_name)}{field('Telepon wali', a.guardian_phone)}
        </dl>
        {a.address && <p className="mt-4 text-sm text-slate-700"><span className="text-xs font-semibold uppercase text-slate-400">Alamat: </span>{a.address}</p>}
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Dokumen</h2>
        {docs.isLoading ? <PageLoading /> : (docs.data?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Pendaftar belum mengunggah dokumen.</p> : (
          <ul className="divide-y divide-slate-100">
            {docs.data?.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <FileText className="size-5 text-emerald-700" />
                <div className="min-w-0 flex-1"><p className="font-medium">{d.doc_type}</p><p className="truncate text-xs text-slate-500">{d.original_name} · {formatDateTime(d.created_at)}</p></div>
                <Button variant="outline" size="sm" onClick={() => openDoc(d.file_path)}>Buka (5 menit)</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Ubah status</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="st"><select id="st" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>{APPLICANT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        </div>
        <Field label="Catatan untuk pendaftar (terlihat pendaftar)" htmlFor="np" hint="Mis. dokumen apa yang perlu diperbaiki.">
          <textarea id="np" rows={3} value={notePublic} onChange={(e) => setNotePublic(e.target.value)} maxLength={1000} className={inputClass} />
        </Field>
        <Field label="Catatan internal (hanya petugas)" htmlFor="ni"><textarea id="ni" rows={3} value={noteInternal} onChange={(e) => setNoteInternal(e.target.value)} maxLength={2000} className={inputClass} /></Field>
        {['accepted', 'rejected'].includes(status) && status !== a.status && (
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="size-4 shrink-0" /> Keputusan penerimaan harus sesuai ketetapan resmi kampus. Pendaftar akan melihat status ini.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Hapus data</Button>
          <Button loading={save.isPending} disabled={status === a.status && !notePublic.trim() && !noteInternal.trim()} onClick={() => save.mutate()}>Simpan</Button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Riwayat</h2>
        {hist.isLoading ? <PageLoading /> : (
          <ol className="space-y-3 border-l-2 border-emerald-200 pl-4">
            {hist.data?.map((h) => (
              <li key={h.id} className="text-sm">
                <p className="text-xs text-slate-400">{formatDateTime(h.created_at)} · {h.status_from && h.status_from !== h.status_to ? `${APPLICANT_STATUS_LABEL[h.status_from] ?? h.status_from} → ` : ''}{APPLICANT_STATUS_LABEL[h.status_to] ?? h.status_to}</p>
                {h.note_public && <p className="text-slate-800"><span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Pendaftar</span>{h.note_public}</p>}
                {h.note_internal && <p className="text-slate-800"><span className="mr-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"><Lock className="size-3" /> Internal</span>{h.note_internal}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <ConfirmDialog open={confirmDel} danger loading={del.isPending} title="Hapus data pendaftar ini?" description="Seluruh data, riwayat, dan dokumen pendaftar dihapus permanen. Lakukan hanya bila ada dasar yang sah." confirmLabel="Ya, hapus"
        onCancel={() => setConfirmDel(false)} onConfirm={() => del.mutate()} />
    </div>
  )
}

function Applicants() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [f, setF] = useState<Filters>({ q: '', status: '', periodId: '', programId: '' })
  const [exporting, setExporting] = useState(false)
  const set = (patch: Partial<Filters>) => { setF((p) => ({ ...p, ...patch })); setPage(1) }

  const periods = useQuery({ queryKey: ['admin-pmb-periods'], queryFn: async () => { const { data, error } = await supabase.from('pmb_periods').select('id, name, academic_year').order('start_date', { ascending: false }); if (error) throw error; return (data ?? []) as Array<{ id: string; name: string; academic_year: string }> } })
  const programs = useQuery({ queryKey: ['admin-pmb-programs'], queryFn: async () => { const { data, error } = await supabase.from('study_programs').select('id, name').order('name'); if (error) throw error; return (data ?? []) as Array<{ id: string; name: string }> } })

  const list = useQuery({
    queryKey: ['admin-applicants', page, f],
    placeholderData: (p) => p,
    queryFn: async () => {
      const base = supabase.from('applicants').select(COLS, { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      const { data, error, count } = await applyFilters(base as never, f) as unknown as { data: Row[] | null; error: unknown; count: number | null }
      if (error) throw error
      return { rows: data ?? [], total: count ?? 0 }
    },
  })

  async function exportCsv() {
    setExporting(true)
    try {
      const all: Row[] = []
      for (let from = 0; from < 10000; from += 1000) {
        const base = supabase.from('applicants').select(COLS).order('created_at', { ascending: false }).range(from, from + 999)
        const { data, error } = await applyFilters(base as never, f) as unknown as { data: Row[] | null; error: unknown }
        if (error) throw error
        all.push(...(data ?? []))
        if ((data?.length ?? 0) < 1000) break
      }
      if (all.length === 0) { toast.message('Tidak ada data untuk diekspor.'); return }
      // Catat ekspor di audit log SEBELUM berkas dibuat; bila gagal, ekspor dibatalkan.
      const desc = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('; ')
      const log = await supabase.rpc('log_applicant_export', { p_count: all.length, p_filter: desc })
      if (log.error) throw log.error

      const head = ['No. Pendaftaran', 'Nama', 'Program Studi', 'Periode', 'Status', 'Tempat Lahir', 'Tanggal Lahir', 'Jenis Kelamin', 'Email', 'Telepon', 'Alamat', 'Asal Sekolah', 'Tahun Lulus', 'Orang Tua/Wali', 'Telepon Wali', 'Tanggal Daftar']
      const lines = [head.map(csvCell).join(',')]
      for (const r of all) {
        lines.push([r.registration_no, r.full_name, r.program?.name, r.period?.name, APPLICANT_STATUS_LABEL[r.status] ?? r.status, r.birth_place, r.birth_date, r.gender ? GENDER_LABEL[r.gender] : '', r.email, r.phone, r.address, r.previous_school, r.graduation_year, r.guardian_name, r.guardian_phone, r.created_at].map(csvCell).join(','))
      }
      const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `pendaftar-pmb-${new Date().toLocaleDateString('en-CA')}.csv`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast.success(`${all.length} data diekspor. Perlakukan berkas ini sebagai data rahasia.`)
    } catch (e) { toast.error(describeDbError(e)) } finally { setExporting(false) }
  }

  if (openId) return <Detail id={openId} onBack={() => setOpenId(null)} />
  const rows = list.data?.rows ?? []
  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_12rem]">
        <SearchBar value={f.q} onSearch={(v) => set({ q: v })} placeholder="Cari nama atau no. pendaftaran (PMB…)" />
        <FilterSelect label="Status" value={f.status} onChange={(v) => set({ status: v })} options={APPLICANT_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        <FilterSelect label="Periode" value={f.periodId} onChange={(v) => set({ periodId: v })} options={(periods.data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.academic_year})` }))} />
        <FilterSelect label="Program studi" value={f.programId} onChange={(v) => set({ programId: v })} options={(programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{list.data?.total ?? 0} pendaftar sesuai filter</p>
        <Button variant="outline" size="sm" loading={exporting} onClick={exportCsv}><Download className="size-4" /> Ekspor CSV</Button>
      </div>
      <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="size-4 shrink-0" /> Ekspor memuat data pribadi dan tercatat di Log Aktivitas. Simpan berkas dengan aman dan hapus setelah tidak diperlukan.</p>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={Users} emptyTitle="Belum ada pendaftar">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Pendaftar</th><th className="px-4 py-3">Program studi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Daftar</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(r.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left font-medium text-emerald-800 hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id) }}>{r.full_name}</button><p className="font-mono text-xs text-slate-400">{r.registration_no}</p></td>
                  <td className="px-4 py-3">{r.program?.name ?? '—'}<p className="text-xs text-slate-400">{r.period?.name}</p></td>
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

type Tab = 'pendaftar' | 'periode' | 'prodi'
export function PmbAdminPage() {
  useDocumentTitle('PMB — Admin')
  const { hasRole } = useAuth()
  const canSeeApplicants = hasRole(...ROLES_PMB)
  const tabs: Array<{ v: Tab; l: string }> = [
    ...(canSeeApplicants ? [{ v: 'pendaftar' as Tab, l: 'Pendaftar' }] : []),
    { v: 'periode', l: 'Periode' }, { v: 'prodi', l: 'Program studi' },
  ]
  const [tab, setTab] = useState<Tab>(tabs[0].v)
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">PMB</h1>
      {!canSeeApplicants && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Data pendaftar hanya dapat diakses petugas PMB dan Super Admin. Anda dapat mengatur periode dan program studi.</p>}
      <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button key={t.v} role="tab" type="button" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === t.v ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{t.l}</button>
        ))}
      </div>
      {tab === 'pendaftar' && canSeeApplicants && <Applicants />}
      {tab === 'periode' && <ResourceManager key="pp" config={RESOURCES['pmb-periode']} />}
      {tab === 'prodi' && <ResourceManager key="ps" config={RESOURCES['pmb-prodi']} />}
    </div>
  )
}
