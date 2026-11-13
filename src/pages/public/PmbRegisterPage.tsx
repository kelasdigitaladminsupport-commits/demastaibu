import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Copy, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { Button, ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field, inputClass } from '../../components/ui/Field'
import { PageLoading } from '../../components/ui/Loading'
import { LoginPrompt } from '../../features/forum/LoginPrompt'
import { ApplicantFields, type ApplicantValues } from '../../features/pmb/ApplicantFields'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fetchMyApplications, fetchPmbInfo, submitApplicant } from '../../services/pmb'
import { formatDate } from '../../utils/format'

type Values = ApplicantValues & { periodId: string; programId: string }

export function PmbRegisterPage() {
  useDocumentTitle('Formulir Pendaftaran PMB')
  const { user, loading } = useAuth()
  const qc = useQueryClient()
  const settings = useSiteSettings()
  const enabled = settings.data?.pmb_enabled === true
  const [result, setResult] = useState<{ id: string; registration_no: string; tracking_code: string } | null>(null)

  const info = useQuery({ queryKey: ['pmb', 'info'], queryFn: fetchPmbInfo, enabled })
  const mine = useQuery({ queryKey: ['pmb', 'mine', user?.id], queryFn: fetchMyApplications, enabled: Boolean(user) && enabled })
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: { email: user?.email ?? '' } })

  const today = new Date().toLocaleDateString('en-CA')
  const openPeriods = (info.data?.periods ?? []).filter((p) => p.start_date <= today && today <= p.end_date)
  const periodId = watch('periodId')
  const alreadyIn = mine.data?.find((a) => a.period_id === periodId)

  async function onSubmit(v: Values) {
    try {
      const r = await submitApplicant({ ...v })
      setResult(r)
      qc.invalidateQueries({ queryKey: ['pmb', 'mine'] })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Pendaftaran gagal.') }
  }

  if (settings.isLoading || loading) return <><PageHeader title="Formulir Pendaftaran PMB" /><PageLoading /></>
  if (!enabled) return (<><PageHeader title="Formulir Pendaftaran PMB" /><EmptyState icon={Lock} title="Pendaftaran belum dibuka" description="Pendaftaran akan tersedia setelah pihak kampus membukanya." /></>)
  if (!user) return (<><PageHeader title="Formulir Pendaftaran PMB" /><Container className="max-w-2xl"><LoginPrompt text="Anda perlu akun (dengan email terverifikasi) untuk mendaftar." /></Container></>)

  if (result) {
    const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success('Disalin.') } catch { toast.error('Gagal menyalin.') } }
    return (
      <>
        <PageHeader title="Pendaftaran Berhasil" />
        <Container className="max-w-2xl space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
            <CheckCircle2 className="mx-auto size-12 text-emerald-700" aria-hidden />
            <p className="mt-3 text-sm text-slate-600">Nomor pendaftaran Anda</p>
            <p className="mx-auto mt-1 w-fit rounded-xl bg-white px-6 py-2 font-mono text-2xl font-bold tracking-wider text-emerald-900">{result.registration_no}</p>
            <p className="mt-4 text-sm text-slate-600">Kode pelacakan</p>
            <p className="mx-auto mt-1 w-fit rounded-xl border-2 border-dashed border-amber-500 bg-white px-6 py-2 font-mono text-xl font-bold tracking-wider text-amber-900">{result.tracking_code}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(result.registration_no)}><Copy className="size-4" /> Salin nomor</Button>
              <Button variant="outline" size="sm" onClick={() => copy(result.tracking_code)}><Copy className="size-4" /> Salin kode</Button>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p><strong>Catat kode pelacakan sekarang.</strong> Demi keamanan, kode hanya ditampilkan sekali dan tidak dapat dilihat kembali. Selama Anda masuk dengan akun ini, Anda tetap dapat melihat pendaftaran dari menu Status.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to={`/pmb/pendaftaran/${result.id}`}>Unggah dokumen</ButtonLink>
            <ButtonLink to={`/pmb/bukti/${result.id}`} variant="outline">Cetak bukti pendaftaran</ButtonLink>
          </div>
        </Container>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Formulir Pendaftaran PMB" description="Isi data dengan benar. Data hanya dapat diakses petugas PMB yang berwenang." />
      <Container className="max-w-3xl">
        {info.isLoading ? <PageLoading /> : openPeriods.length === 0 ? (
          <EmptyState icon={Lock} title="Tidak ada periode pendaftaran yang sedang dibuka" description="Lihat halaman informasi untuk jadwal penerimaan." >
            <ButtonLink to="/pmb" variant="outline">Informasi PMB</ButtonLink>
          </EmptyState>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Periode *" htmlFor="periodId" error={errors.periodId?.message}>
                <select id="periodId" className={inputClass} {...register('periodId', { required: 'Pilih periode' })}>
                  <option value="">— Pilih —</option>
                  {openPeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.academic_year}) · s.d. {formatDate(p.end_date)}</option>)}
                </select>
              </Field>
              <Field label="Program studi *" htmlFor="programId" error={errors.programId?.message}>
                <select id="programId" className={inputClass} {...register('programId', { required: 'Pilih program studi' })}>
                  <option value="">— Pilih —</option>
                  {info.data?.programs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>

            {alreadyIn && (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Anda sudah terdaftar pada periode ini ({alreadyIn.registration_no}). <Link to={`/pmb/pendaftaran/${alreadyIn.id}`} className="font-semibold underline">Buka pendaftaran Anda</Link>.</p>
            )}

            <ApplicantFields register={register as never} errors={errors} />

            <p className="text-xs text-slate-500">Kami hanya meminta data yang diperlukan untuk proses seleksi. Dokumen diunggah setelah pendaftaran terkirim.</p>
            <Button type="submit" loading={isSubmitting} disabled={Boolean(alreadyIn)}>Kirim pendaftaran</Button>
          </form>
        )}
      </Container>
    </>
  )
}
