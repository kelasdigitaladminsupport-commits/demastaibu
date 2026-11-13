import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Container } from '../../components/ui/Container'
import { Button, ButtonLink } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/Loading'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { LoginPrompt } from '../../features/forum/LoginPrompt'
import { ApplicantFields, type ApplicantValues } from '../../features/pmb/ApplicantFields'
import { APPLICANT_STATUS_CLS, APPLICANT_STATUS_LABEL, EDITABLE_STATUSES } from '../../features/pmb/constants'
import { DocumentsManager } from '../../features/pmb/DocumentsManager'
import { NotFoundPage } from './NotFoundPage'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fetchMyApplication, fetchMyHistory, updateMyApplication, type Application } from '../../services/pmb'
import { formatDateTime } from '../../utils/format'

function toValues(a: Application): ApplicantValues {
  return {
    fullName: a.full_name, birthPlace: a.birth_place ?? '', birthDate: a.birth_date ?? '', gender: a.gender ?? '', email: a.email, phone: a.phone ?? '',
    address: a.address ?? '', previousSchool: a.previous_school ?? '', graduationYear: a.graduation_year ? String(a.graduation_year) : '',
    guardianName: a.guardian_name ?? '', guardianPhone: a.guardian_phone ?? '',
  }
}

export function PmbApplicationPage() {
  useDocumentTitle('Pendaftaran Saya')
  const { id = '' } = useParams()
  const { user, loading } = useAuth()
  const qc = useQueryClient()
  const app = useQuery({ queryKey: ['pmb', 'app', id], queryFn: () => fetchMyApplication(id), enabled: Boolean(user) })
  const history = useQuery({ queryKey: ['pmb', 'history', id], queryFn: () => fetchMyHistory(id), enabled: Boolean(user) })
  const a = app.data
  const editable = a ? EDITABLE_STATUSES.includes(a.status) : false

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<ApplicantValues>()
  useEffect(() => { if (a) reset(toValues(a)) }, [a, reset])

  async function onSave(v: ApplicantValues) {
    try {
      await updateMyApplication(id, v)
      toast.success('Data diperbarui.')
      qc.invalidateQueries({ queryKey: ['pmb'] })
    } catch { toast.error('Data tidak dapat disimpan. Pendaftaran mungkin sudah tidak dapat diubah.') }
  }

  if (loading) return <PageLoading />
  if (!user) return <Container className="max-w-2xl"><LoginPrompt text="Masuk untuk melihat pendaftaran Anda." /></Container>
  if (!app.isLoading && !app.error && !a) return <NotFoundPage />

  const lastNote = [...(history.data ?? [])].reverse().find((h) => h.note)

  return (
    <Container className="max-w-3xl space-y-8">
      <Link to="/pmb/status" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="size-4" /> Status pendaftaran</Link>
      <QueryBoundary isLoading={app.isLoading} error={app.error} onRetry={() => app.refetch()} isEmpty={!a} emptyTitle="Pendaftaran tidak ditemukan">
        {a && (
          <>
            <header className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-mono text-sm text-slate-500">{a.registration_no}</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-emerald-950">{a.program?.name} · {a.period?.name}</h1>
              <p className="mt-3"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${APPLICANT_STATUS_CLS[a.status] ?? ''}`}>{APPLICANT_STATUS_LABEL[a.status] ?? a.status}</span></p>
              {a.status === 'need_revision' && lastNote?.note && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Catatan petugas:</strong> {lastNote.note}</div>
              )}
              <div className="mt-4"><ButtonLink to={`/pmb/bukti/${a.id}`} variant="outline" size="sm"><Printer className="size-4" /> Cetak bukti pendaftaran</ButtonLink></div>
            </header>

            <section>
              <h2 className="font-display text-xl font-bold text-emerald-950">Dokumen</h2>
              <div className="mt-3"><DocumentsManager applicantId={a.id} userId={user.id} editable={editable} /></div>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-emerald-950">Data pendaftar</h2>
              <form onSubmit={handleSubmit(onSave)} noValidate className="mt-3 space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
                <fieldset disabled={!editable} className="space-y-5 disabled:opacity-70"><ApplicantFields register={register} errors={errors} /></fieldset>
                {editable ? <div className="flex justify-end"><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Simpan perubahan</Button></div>
                  : <p className="text-xs text-slate-500">Data tidak dapat diubah pada status ini.</p>}
              </form>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-emerald-950">Riwayat status</h2>
              {history.isLoading ? <PageLoading /> : (
                <ol className="mt-3 space-y-3 border-l-2 border-emerald-200 pl-4">
                  {history.data?.map((h, i) => (
                    <li key={i} className="text-sm"><p className="text-xs text-slate-400">{formatDateTime(h.at)} · {APPLICANT_STATUS_LABEL[h.status] ?? h.status}</p>
                      {h.note && <p className="whitespace-pre-line text-slate-700">{h.note}</p>}</li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </QueryBoundary>
    </Container>
  )
}
