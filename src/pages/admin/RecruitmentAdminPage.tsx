import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, ShieldAlert, Trash2, Users } from 'lucide-react'
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
import { RECRUIT_STATUSES, RECRUIT_STATUS_CLS, RECRUIT_STATUS_LABEL } from '../../features/recruitment/constants'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { FK_FIRST, FK_SECOND } from '../../services/recruitment'
import { cn } from '../../utils/cn'
import { formatDateTime } from '../../utils/format'

interface Row {
  id: string; registration_no: string; full_name: string; nim: string; study_program: string | null; semester: number | null
  email: string; phone: string; motivation: string; experience: string | null; status: string; note_public: string | null; created_at: string
  period: { name: string; academic_year: string } | null
  first_department: { name: string } | null; second_department: { name: string } | null
}
const PAGE = 15
const COLS = `id, registration_no, full_name, nim, study_program, semester, email, phone, motivation, experience, status, note_public, created_at, period:recruitment_periods(name, academic_year), first_department:${FK_FIRST}, second_department:${FK_SECOND}`
const Badge = ({ status }: { status: string }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${RECRUIT_STATUS_CLS[status] ?? ''}`}>{RECRUIT_STATUS_LABEL[status] ?? status}</span>

interface Filters { q: string; status: string; periodId: string }

function applyFilters<T extends { eq: (c: string, v: string) => T; ilike: (c: string, v: string) => T }>(query: T, f: Filters): T {
  let qy = query
  if (f.status) qy = qy.eq('status', f.status)
  if (f.periodId) qy = qy.eq('period_id', f.periodId)
  if (f.q) {
    const esc = `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
    qy = /^REK/i.test(f.q) ? qy.eq('registration_no', f.q.toUpperCase()) : /^\d+$/.test(f.q) ? qy.ilike('nim', esc) : qy.ilike('full_name', esc)
  }
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
  const [note, setNote] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const q = useQuery({
    queryKey: ['admin-recruit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('recruitment_applications').select(COLS).eq('id', id).single()
      if (error) throw error
      return data as unknown as Row
    },
  })
  const a = q.data
  useEffect(() => { if (a) { setStatus(a.status); setNote(a.note_public ?? '') } }, [a])
  const refresh = () => { for (const k of ['admin-recruit', 'admin-recruits']) qc.invalidateQueries({ queryKey: [k] }) }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('recruitment_applications').update({ status, note_public: note.trim() || null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Status dan catatan disimpan.'); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('recruitment_applications').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Data pendaftar dihapus.'); refresh(); onBack() },
    onError: (e) => { toast.error(describeDbError(e)); setConfirmDel(false) },
  })

  if (q.isLoading) return <PageLoading />
  if (!a) return <p className="text-sm text-red-600">Data pendaftar tidak dapat dimuat.</p>
  const field = (k: string, v: string | number | null | undefined) => <div key={k}><dt className="text-xs font-semibold uppercase text-slate-400">{k}</dt><dd className="text-sm text-slate-900">{v || '—'}</dd></div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="size-4" /> Kembali ke daftar</button>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="font-mono text-sm text-slate-500">{a.registration_no} · {formatDateTime(a.created_at)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-emerald-950">{a.full_name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2"><Badge status={a.status} /><span className="text-sm text-slate-600">{a.period?.name} ({a.period?.academic_year})</span></p>
        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {field('NIM', a.nim)}{field('Program studi', a.study_program)}{field('Semester', a.semester)}
          {field('Email', a.email)}{field('Telepon', a.phone)}
          {field('Pilihan bidang 1', a.first_department?.name)}{field('Pilihan bidang 2', a.second_department?.name)}
        </dl>
        <h2 className="mt-6 text-xs font-semibold uppercase text-slate-400">Motivasi</h2>
        <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-800">{a.motivation}</p>
        {a.experience && (<><h2 className="mt-5 text-xs font-semibold uppercase text-slate-400">Pengalaman organisasi</h2><p className="mt-1 whitespace-pre-line break-words text-sm text-slate-800">{a.experience}</p></>)}
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-emerald-950">Ubah status</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="st"><select id="st" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>{RECRUIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        </div>
        <Field label="Catatan untuk pendaftar (terlihat pendaftar)" htmlFor="note" hint="Mis. jadwal wawancara atau kelengkapan yang perlu dibawa.">
          <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputClass} />
        </Field>
        {['accepted', 'rejected'].includes(status) && status !== a.status && (
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="size-4 shrink-0" /> Keputusan harus sesuai hasil seleksi resmi. Pendaftar akan melihat status ini.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Hapus data</Button>
          <Button loading={save.isPending} disabled={status === a.status && note.trim() === (a.note_public ?? '')} onClick={() => save.mutate()}>Simpan</Button>
        </div>
      </section>

      <ConfirmDialog open={confirmDel} danger loading={del.isPending} title="Hapus data pendaftar ini?" description="Data pendaftar dihapus permanen. Lakukan hanya bila ada dasar yang sah." confirmLabel="Ya, hapus"
        onCancel={() => setConfirmDel(false)} onConfirm={() => del.mutate()} />
    </div>
  )
}

function Applicants() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [f, setF] = useState<Filters>({ q: '', status: '', periodId: '' })
  const [exporting, setExporting] = useState(false)
  const set = (patch: Partial<Filters>) => { setF((p) => ({ ...p, ...patch })); setPage(1) }

  const periods = useQuery({ queryKey: ['admin-recruit-periods'], queryFn: async () => { const { data, error } = await supabase.from('recruitment_periods').select('id, name, academic_year').order('start_date', { ascending: false }); if (error) throw error; return (data ?? []) as Array<{ id: string; name: string; academic_year: string }> } })
  const list = useQuery({
    queryKey: ['admin-recruits', page, f],
    placeholderData: (p) => p,
    queryFn: async () => {
      const base = supabase.from('recruitment_applications').select(COLS, { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
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
        const base = supabase.from('recruitment_applications').select(COLS).order('created_at', { ascending: false }).range(from, from + 999)
        const { data, error } = await applyFilters(base as never, f) as unknown as { data: Row[] | null; error: unknown }
        if (error) throw error
        all.push(...(data ?? []))
        if ((data?.length ?? 0) < 1000) break
      }
      if (all.length === 0) { toast.message('Tidak ada data untuk diekspor.'); return }
      // Catat ekspor di audit log SEBELUM berkas dibuat; bila gagal, ekspor dibatalkan.
      const desc = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('; ')
      const log = await supabase.rpc('log_recruitment_export', { p_count: all.length, p_filter: desc })
      if (log.error) throw log.error

      const head = ['No. Pendaftaran', 'Nama', 'NIM', 'Program Studi', 'Semester', 'Periode', 'Bidang 1', 'Bidang 2', 'Status', 'Email', 'Telepon', 'Motivasi', 'Pengalaman', 'Tanggal Daftar']
      const lines = [head.map(csvCell).join(',')]
      for (const r of all) {
        lines.push([r.registration_no, r.full_name, r.nim, r.study_program, r.semester, r.period?.name, r.first_department?.name, r.second_department?.name, RECRUIT_STATUS_LABEL[r.status] ?? r.status, r.email, r.phone, r.motivation, r.experience, r.created_at].map(csvCell).join(','))
      }
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `pendaftar-pengurus-${new Date().toLocaleDateString('en-CA')}.csv`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast.success(`${all.length} data diekspor. Perlakukan berkas ini sebagai data rahasia.`)
    } catch (e) { toast.error(describeDbError(e)) } finally { setExporting(false) }
  }

  if (openId) return <Detail id={openId} onBack={() => setOpenId(null)} />
  const rows = list.data?.rows ?? []
  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_12rem_14rem]">
        <SearchBar value={f.q} onSearch={(v) => set({ q: v })} placeholder="Cari nama, NIM, atau no. pendaftaran (REK…)" />
        <FilterSelect label="Status" value={f.status} onChange={(v) => set({ status: v })} options={RECRUIT_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        <FilterSelect label="Periode" value={f.periodId} onChange={(v) => set({ periodId: v })} options={(periods.data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.academic_year})` }))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{list.data?.total ?? 0} pendaftar sesuai filter</p>
        <Button variant="outline" size="sm" loading={exporting} onClick={exportCsv}><Download className="size-4" /> Ekspor CSV</Button>
      </div>
      <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="size-4 shrink-0" /> Ekspor memuat data pribadi dan tercatat di Log Aktivitas. Simpan berkas dengan aman dan hapus setelah tidak diperlukan.</p>
      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={rows.length === 0} emptyIcon={Users} emptyTitle="Belum ada pendaftar">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Pendaftar</th><th className="px-4 py-3">Bidang pilihan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Daftar</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(r.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left font-medium text-emerald-800 hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id) }}>{r.full_name}</button><p className="font-mono text-xs text-slate-400">{r.registration_no} · NIM {r.nim}</p></td>
                  <td className="px-4 py-3">{r.first_department?.name ?? '—'}{r.second_department && <p className="text-xs text-slate-400">2. {r.second_department.name}</p>}</td>
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

type Tab = 'pendaftar' | 'periode'
export function RecruitmentAdminPage() {
  useDocumentTitle('Rekrutmen Pengurus — Admin')
  const [tab, setTab] = useState<Tab>('pendaftar')
  const tabs: Array<{ v: Tab; l: string }> = [{ v: 'pendaftar', l: 'Pendaftar' }, { v: 'periode', l: 'Periode & Persyaratan' }]
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Rekrutmen Pengurus</h1>
      <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button key={t.v} role="tab" type="button" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === t.v ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{t.l}</button>
        ))}
      </div>
      {tab === 'pendaftar' && <Applicants />}
      {tab === 'periode' && <ResourceManager key="rp" config={RESOURCES['rekrutmen-periode']} />}
    </div>
  )
}
