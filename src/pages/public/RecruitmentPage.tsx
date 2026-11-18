import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, ClipboardList, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { ButtonLink } from '../../components/ui/Button'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { TextContent } from '../../components/ui/TextContent'
import { GuidelineViewer } from '../../features/recruitment/GuidelineViewer'
import { splitRequirements, windowState } from '../../features/recruitment/constants'
import { fetchRecruitmentInfo } from '../../services/recruitment'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/format'

const WINDOW_BADGE = {
  open: { label: 'Pendaftaran dibuka', cls: 'bg-emerald-100 text-emerald-800' },
  upcoming: { label: 'Segera dibuka', cls: 'bg-sky-100 text-sky-800' },
  closed: { label: 'Ditutup', cls: 'bg-slate-200 text-slate-600' },
} as const

export function RecruitmentPage() {
  useDocumentTitle('Pendaftaran Kepengurusan DEMA')
  const q = useQuery({ queryKey: ['recruitment', 'info'], queryFn: fetchRecruitmentInfo })
  const periods = q.data?.periods ?? []
  const departments = q.data?.departments ?? []

  return (
    <>
      <PageHeader title="Pendaftaran Kepengurusan" description="Bergabunglah menjadi pengurus DEMA periode berikutnya. Periksa persyaratan, jadwal, dan pedoman resmi di bawah ini." />
      <Container className="max-w-4xl space-y-10">
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={periods.length === 0}
          emptyIcon={ClipboardList} emptyTitle="Pendaftaran belum dibuka" emptyDescription="Informasi dan formulir pendaftaran pengurus akan tampil di sini setelah dibuka oleh pengelola.">
          {periods.map((p) => {
            const state = windowState(p.start_date, p.end_date)
            const reqs = splitRequirements(p.requirements)
            const leaderReqs = splitRequirements(p.leadership_requirements)
            const badge = WINDOW_BADGE[state]
            return (
              <section key={p.id} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <header>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Periode kepengurusan {p.academic_year}</p>
                    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', badge.cls)}>{badge.label}</span>
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-bold text-emerald-950">{p.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="size-4" aria-hidden /> Pendaftaran: <strong>{formatDate(p.start_date)} – {formatDate(p.end_date)}</strong>
                  </p>
                </header>

                {p.description && <TextContent text={p.description} />}

                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-emerald-900">Dua jalur pendaftaran</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li><strong>Ketua dan Wakil Ketua DEMA:</strong> melampirkan visi-misi, program kerja, dan pengalaman organisasi.</li>
                    <li><strong>Koordinator Bidang dan Anggota:</strong> memilih bidang yang diminati.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-display text-lg font-semibold text-emerald-900">{leaderReqs.length > 0 ? 'Persyaratan Koordinator Bidang & Anggota' : 'Persyaratan pendaftaran'}</h3>
                  {reqs.length > 0 ? (
                    <ol className="mt-3 space-y-2">
                      {reqs.map((r, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700">
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Persyaratan mengacu pada Pedoman Kemahasiswaan{p.guideline_path ? ' pada dokumen di bawah' : ''}.</p>
                  )}
                </div>

                {leaderReqs.length > 0 && (
                  <div>
                    <h3 className="font-display text-lg font-semibold text-emerald-900">Persyaratan Ketua & Wakil Ketua DEMA</h3>
                    <ol className="mt-3 space-y-2">
                      {leaderReqs.map((r, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden /><span>{r}</span></li>
                      ))}
                    </ol>
                  </div>
                )}

                {p.schedule && (<div><h3 className="font-display text-lg font-semibold text-emerald-900">Jadwal</h3><TextContent text={p.schedule} className="mt-2" /></div>)}

                {p.guideline_path && <GuidelineViewer path={p.guideline_path} title={p.guideline_title} />}

                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                  {state === 'open'
                    ? <ButtonLink to="/rekrutmen/daftar" variant="gold">Daftar sekarang</ButtonLink>
                    : <p className="text-sm text-slate-500">{state === 'upcoming' ? `Formulir dibuka pada ${formatDate(p.start_date)}.` : 'Periode pendaftaran ini sudah berakhir.'}</p>}
                  <ButtonLink to="/rekrutmen/daftar" variant="outline">Cek status pendaftaran saya</ButtonLink>
                </div>
              </section>
            )
          })}

          {departments.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-emerald-950"><Users className="size-5" aria-hidden /> Bidang yang dapat dipilih</h2>
              <div className="mt-2 h-1 w-12 rounded bg-gold" />
              <ul className="mt-4 flex flex-wrap gap-2">
                {departments.map((d) => <li key={d.id} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-900">{d.name}</li>)}
              </ul>
            </section>
          )}
        </QueryBoundary>
        <p className="text-sm text-slate-500">Data pendaftar hanya dapat diakses pengelola yang berwenang dan digunakan untuk proses seleksi.</p>
      </Container>
    </>
  )
}
