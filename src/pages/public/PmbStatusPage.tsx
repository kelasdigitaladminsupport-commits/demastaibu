import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { inputClass } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Loading'
import { APPLICANT_STATUS_CLS, APPLICANT_STATUS_LABEL } from '../../features/pmb/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fetchMyApplications, trackApplicant, type PmbTrack } from '../../services/pmb'
import { formatDateTime } from '../../utils/format'

export function PmbStatusPage() {
  useDocumentTitle('Pelacakan Status Pendaftaran')
  const { user } = useAuth()
  const [reg, setReg] = useState('')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<PmbTrack | null | undefined>(undefined)

  const mine = useQuery({ queryKey: ['pmb', 'mine', user?.id], queryFn: fetchMyApplications, enabled: Boolean(user) })
  const track = useMutation({
    mutationFn: () => trackApplicant(reg, code),
    onSuccess: setResult,
    onError: (e) => { setResult(undefined); toast.error(e instanceof Error ? e.message : 'Gagal melacak.') },
  })

  return (
    <>
      <PageHeader title="Pelacakan Status Pendaftaran" />
      <Container className="max-w-3xl space-y-10">
        {user && (mine.data?.length ?? 0) > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-emerald-950">Pendaftaran saya</h2>
            <ul className="mt-4 space-y-3">
              {mine.data?.map((a) => (
                <li key={a.id}>
                  <Link to={`/pmb/pendaftaran/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-600">
                    <div><p className="font-mono text-sm text-slate-500">{a.registration_no}</p>
                      <p className="font-semibold text-slate-900">{a.program?.name ?? 'Program studi'}</p>
                      <p className="text-xs text-slate-500">{a.period?.name}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${APPLICANT_STATUS_CLS[a.status] ?? ''}`}>{APPLICANT_STATUS_LABEL[a.status] ?? a.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl font-bold text-emerald-950">Lacak dengan kode</h2>
          <p className="mt-1 text-sm text-slate-600">Masukkan nomor pendaftaran dan kode pelacakan yang Anda terima saat mendaftar.</p>
          <form onSubmit={(e) => { e.preventDefault(); track.mutate() }} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={reg} onChange={(e) => setReg(e.target.value.toUpperCase())} placeholder="Nomor pendaftaran (PMB…)" aria-label="Nomor pendaftaran" className={`${inputClass} font-mono`} maxLength={40} />
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Kode pelacakan (TRK-…)" aria-label="Kode pelacakan" className={`${inputClass} font-mono`} maxLength={40} />
            <Button type="submit" loading={track.isPending} disabled={!reg.trim() || !code.trim()}>Lacak</Button>
          </form>
          {!user && <p className="mt-3 text-xs text-slate-500">Punya akun? <Link to="/masuk" state={{ from: '/pmb/status' }} className="font-semibold text-emerald-800 underline">Masuk</Link> untuk melihat pendaftaran Anda tanpa kode.</p>}

          <div className="mt-6">
            {track.isPending && <Spinner />}
            {result === null && <EmptyState icon={SearchX} title="Pendaftaran tidak ditemukan" description="Periksa kembali nomor dan kode pelacakan Anda." />}
            {result && (
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="font-mono text-sm text-slate-500">{result.registration_no}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">{result.program ?? 'Program studi'} · {result.period}</h3>
                <p className="mt-3"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${APPLICANT_STATUS_CLS[result.status] ?? ''}`}>{APPLICANT_STATUS_LABEL[result.status] ?? result.status}</span></p>
                {result.history.length > 0 && (
                  <ol className="mt-5 space-y-3 border-l-2 border-emerald-200 pl-4">
                    {result.history.map((h, i) => (
                      <li key={i} className="text-sm"><p className="text-xs text-slate-400">{formatDateTime(h.at)} · {APPLICANT_STATUS_LABEL[h.status] ?? h.status}</p>
                        {h.note && <p className="whitespace-pre-line text-slate-700">{h.note}</p>}</li>
                    ))}
                  </ol>
                )}
                <p className="mt-5 text-xs text-slate-400">Terdaftar {formatDateTime(result.submitted_at)}</p>
              </article>
            )}
          </div>
        </section>
      </Container>
    </>
  )
}
