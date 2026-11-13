import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ClipboardList, FileText, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { Button, ButtonLink } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field, inputClass } from '../../components/ui/Field'
import { PageLoading } from '../../components/ui/Loading'
import { LoginPrompt } from '../../features/forum/LoginPrompt'
import { GuidelineViewer } from '../../features/recruitment/GuidelineViewer'
import { RECRUIT_STATUS_CLS, RECRUIT_STATUS_LABEL, WITHDRAWABLE, splitRequirements, windowState } from '../../features/recruitment/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import {
  fetchMyRecruitment, fetchRecruitmentInfo, submitRecruitment, withdrawRecruitment,
  type RecruitmentApplication, type RecruitmentInput,
} from '../../services/recruitment'
import { formatDate, formatDateTime } from '../../utils/format'

const TITLE = 'Formulir Pendaftaran Pengurus'
const max = (n: number) => ({ maxLength: { value: n, message: `Maksimal ${n} karakter` } })

function StatusCard({ a, onWithdraw }: { a: RecruitmentApplication; onWithdraw: (a: RecruitmentApplication) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="font-mono text-sm text-slate-500">{a.registration_no} · {formatDateTime(a.created_at)}</p>
      <h2 className="mt-1 font-display text-xl font-bold text-emerald-950">{a.full_name}</h2>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${RECRUIT_STATUS_CLS[a.status] ?? ''}`}>{RECRUIT_STATUS_LABEL[a.status] ?? a.status}</span>
        <span className="text-sm text-slate-600">{a.period?.name} ({a.period?.academic_year})</span>
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase text-slate-400">Pilihan bidang 1</dt><dd>{a.first_department?.name ?? '—'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-slate-400">Pilihan bidang 2</dt><dd>{a.second_department?.name ?? '—'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-slate-400">NIM</dt><dd>{a.nim}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-slate-400">Program studi / semester</dt><dd>{[a.study_program, a.semester ? `semester ${a.semester}` : null].filter(Boolean).join(' · ') || '—'}</dd></div>
      </dl>
      {a.note_public && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Catatan panitia:</strong> {a.note_public}</p>}
      {WITHDRAWABLE.includes(a.status) && (
        <div className="mt-4 border-t border-slate-100 pt-4"><Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => onWithdraw(a)}>Mengundurkan diri</Button></div>
      )}
    </section>
  )
}

export function RecruitmentRegisterPage() {
  useDocumentTitle(TITLE)
  const { user, loading } = useAuth()
  const qc = useQueryClient()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [toWithdraw, setToWithdraw] = useState<RecruitmentApplication | null>(null)

  const info = useQuery({ queryKey: ['recruitment', 'info'], queryFn: fetchRecruitmentInfo })
  const mine = useQuery({ queryKey: ['recruitment', 'mine', user?.id], queryFn: () => fetchMyRecruitment(user!.id), enabled: Boolean(user) })
  const { register, handleSubmit, watch, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<RecruitmentInput>({ defaultValues: { email: user?.email ?? '' } })

  useEffect(() => { if (user?.email && !getValues('email')) setValue('email', user.email) }, [user?.email, getValues, setValue])

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const taken = new Set((mine.data ?? []).map((a) => a.period_id))
  const openPeriods = (info.data?.periods ?? []).filter((p) => windowState(p.start_date, p.end_date, today) === 'open' && !taken.has(p.id))
  const periodId = watch('periodId')
  const firstDept = watch('firstDepartmentId')
  const period = openPeriods.find((p) => p.id === periodId)
  const reqs = splitRequirements(period?.requirements)
  // Tanpa daftar syarat terperinci: satu pernyataan umum (merujuk pedoman)
  const items = reqs.length > 0 ? reqs : ['Saya telah membaca Pedoman Kemahasiswaan dan memenuhi seluruh persyaratan pendaftaran pengurus.']
  const allChecked = Boolean(period) && items.every((_, i) => checked[`${period?.id}:${i}`])

  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawRecruitment(id),
    onSuccess: () => { toast.success('Pendaftaran dibatalkan.'); setToWithdraw(null); qc.invalidateQueries({ queryKey: ['recruitment', 'mine'] }) },
    onError: (e) => { toast.error(e instanceof Error ? e.message : 'Gagal membatalkan.'); setToWithdraw(null) },
  })

  async function onSubmit(v: RecruitmentInput) {
    if (!allChecked) { toast.error('Centang semua persyaratan terlebih dahulu.'); return }
    try {
      const r = await submitRecruitment(v)
      toast.success(`Pendaftaran terkirim. Nomor: ${r.registration_no}`)
      setChecked({}); reset({ email: user?.email ?? '' })
      await qc.invalidateQueries({ queryKey: ['recruitment', 'mine'] })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Pendaftaran gagal.') }
  }

  if (loading) return <><PageHeader title={TITLE} /><PageLoading /></>
  if (!user) return (<><PageHeader title={TITLE} /><Container className="max-w-2xl"><LoginPrompt text="Anda perlu akun untuk mendaftar sebagai pengurus dan memantau statusnya." /></Container></>)
  if (info.isLoading || mine.isLoading) return <><PageHeader title={TITLE} /><PageLoading /></>

  const myApps = mine.data ?? []
  return (
    <>
      <PageHeader title={TITLE} description="Isi data dengan benar. Data hanya dapat diakses pengelola yang berwenang." />
      <Container className="max-w-3xl space-y-8">
        {myApps.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-emerald-950">Pendaftaran Anda</h2>
            {myApps.map((a) => <StatusCard key={a.id} a={a} onWithdraw={setToWithdraw} />)}
          </div>
        )}

        {openPeriods.length === 0 ? (
          myApps.length === 0 && (
            <EmptyState icon={Lock} title="Tidak ada periode pendaftaran yang sedang dibuka" description="Lihat halaman informasi untuk jadwal dan persyaratan.">
              <ButtonLink to="/rekrutmen" variant="outline">Informasi pendaftaran</ButtonLink>
            </EmptyState>
          )
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
            {myApps.length > 0 && <h2 className="font-display text-xl font-bold text-emerald-950">Pendaftaran baru</h2>}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Periode *" htmlFor="periodId" error={errors.periodId?.message}>
                  <select id="periodId" className={inputClass} {...register('periodId', { required: 'Pilih periode' })}>
                    <option value="">— Pilih —</option>
                    {openPeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.academic_year}) · s.d. {formatDate(p.end_date)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Pilihan bidang 1 *" htmlFor="firstDepartmentId" error={errors.firstDepartmentId?.message}>
                <select id="firstDepartmentId" className={inputClass} {...register('firstDepartmentId', { required: 'Pilih bidang' })}>
                  <option value="">— Pilih —</option>
                  {info.data?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Pilihan bidang 2 (opsional)" htmlFor="secondDepartmentId" error={errors.secondDepartmentId?.message}>
                <select id="secondDepartmentId" className={inputClass} {...register('secondDepartmentId')}>
                  <option value="">—</option>
                  {info.data?.departments.filter((d) => d.id !== firstDept).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Nama lengkap *" htmlFor="fullName" error={errors.fullName?.message}>
                <input id="fullName" autoComplete="name" className={inputClass} {...register('fullName', { required: 'Wajib diisi', minLength: { value: 2, message: 'Minimal 2 karakter' }, ...max(150) })} />
              </Field>
              <Field label="NIM *" htmlFor="nim" error={errors.nim?.message}>
                <input id="nim" className={inputClass} {...register('nim', { required: 'Wajib diisi', minLength: { value: 3, message: 'Minimal 3 karakter' }, ...max(30) })} />
              </Field>
              <Field label="Program studi" htmlFor="studyProgram" error={errors.studyProgram?.message}>
                <input id="studyProgram" className={inputClass} {...register('studyProgram', max(150))} />
              </Field>
              <Field label="Semester saat ini" htmlFor="semester" error={errors.semester?.message}>
                <input id="semester" type="number" inputMode="numeric" className={inputClass} {...register('semester', { min: { value: 1, message: 'Tidak valid' }, max: { value: 14, message: 'Tidak valid' } })} />
              </Field>
              <Field label="Email *" htmlFor="email" error={errors.email?.message}>
                <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email', { required: 'Wajib diisi', pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Format email tidak valid' } })} />
              </Field>
              <Field label="Telepon / WhatsApp *" htmlFor="phone" error={errors.phone?.message}>
                <input id="phone" autoComplete="tel" className={inputClass} {...register('phone', { required: 'Wajib diisi', ...max(30) })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Motivasi bergabung *" htmlFor="motivation" error={errors.motivation?.message} hint="Minimal 20 karakter.">
                  <textarea id="motivation" rows={5} className={inputClass} {...register('motivation', { required: 'Wajib diisi', minLength: { value: 20, message: 'Minimal 20 karakter' }, ...max(3000) })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Pengalaman organisasi (opsional)" htmlFor="experience" error={errors.experience?.message}>
                  <textarea id="experience" rows={4} className={inputClass} {...register('experience', max(3000))} />
                </Field>
              </div>
            </div>

            {period && (
              <fieldset className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                <legend className="px-2 font-display text-lg font-semibold text-emerald-900">Persyaratan — centang yang telah Anda penuhi</legend>
                {items.map((r, i) => {
                  const key = `${period.id}:${i}`
                  return (
                    <label key={key} className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
                      <input type="checkbox" className="mt-0.5 size-4 accent-emerald-700" checked={Boolean(checked[key])} onChange={(e) => setChecked((c) => ({ ...c, [key]: e.target.checked }))} />
                      <span>{r}</span>
                    </label>
                  )
                })}
                {period.guideline_path && <div className="pt-2"><GuidelineViewer path={period.guideline_path} title={period.guideline_title} /></div>}
              </fieldset>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" loading={isSubmitting} disabled={!allChecked}><ClipboardList className="size-4" aria-hidden /> Kirim pendaftaran</Button>
              {!period ? <p className="text-xs text-slate-500">Pilih periode untuk melihat persyaratan.</p> : !allChecked && <p className="text-xs text-slate-500">Centang semua persyaratan untuk mengirim.</p>}
            </div>
          </form>
        )}

        <p className="flex items-start gap-2 text-sm text-slate-500"><FileText className="mt-0.5 size-4 shrink-0" aria-hidden /> Syarat lengkap ada di halaman <Link to="/rekrutmen" className="font-semibold text-emerald-800 underline">informasi pendaftaran</Link>.</p>
      </Container>

      <ConfirmDialog open={toWithdraw !== null} danger loading={withdraw.isPending} title="Mengundurkan diri dari pendaftaran?"
        description="Pendaftaran Anda ditandai mengundurkan diri dan tidak dapat diaktifkan kembali pada periode yang sama." confirmLabel="Ya, mundur"
        onCancel={() => setToWithdraw(null)} onConfirm={() => toWithdraw && withdraw.mutate(toWithdraw.id)} />
    </>
  )
}
