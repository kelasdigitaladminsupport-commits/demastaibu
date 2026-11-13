import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { inputClass } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Loading'
import { trackPartnership, type PartnershipTrack } from '../../services/partnerships'
import { formatDateTime } from '../../utils/format'
import { PARTNER_STATUS_CLS, PARTNER_STATUS_LABEL } from './constants'

export function TrackPanel({ initialRef = '', initialEmail = '' }: { initialRef?: string; initialEmail?: string }) {
  const [ref, setRef] = useState(initialRef)
  const [email, setEmail] = useState(initialEmail)
  const [result, setResult] = useState<PartnershipTrack | null | undefined>(undefined)

  const track = useMutation({
    mutationFn: ({ r, e }: { r: string; e: string }) => trackPartnership(r, e),
    onSuccess: setResult,
    onError: (e) => { setResult(undefined); toast.error(e instanceof Error ? e.message : 'Gagal melacak.') },
  })
  useEffect(() => { if (initialRef && initialEmail) { setRef(initialRef); setEmail(initialEmail); track.mutate({ r: initialRef, e: initialEmail }) } }, [initialRef, initialEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <form onSubmit={(ev) => { ev.preventDefault(); track.mutate({ r: ref, e: email }) }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="Nomor referensi (KRJ-…)" aria-label="Nomor referensi" className={`${inputClass} font-mono tracking-wider`} maxLength={30} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email yang didaftarkan" aria-label="Email" className={inputClass} />
        <Button type="submit" loading={track.isPending} disabled={!ref.trim() || !email.trim()}>Lacak</Button>
      </form>
      {track.isPending && <Spinner />}
      {result === null && <EmptyState icon={SearchX} title="Permohonan tidak ditemukan" description="Pastikan nomor referensi dan email sesuai dengan yang Anda isi saat mengajukan." />}
      {result && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-mono text-sm text-slate-500">{result.reference_no}</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">{result.org_name}</h2>
          <p className="mt-3"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${PARTNER_STATUS_CLS[result.status] ?? ''}`}>{PARTNER_STATUS_LABEL[result.status] ?? result.status}</span></p>
          {result.history.length > 0 && (
            <ol className="mt-5 space-y-3 border-l-2 border-emerald-200 pl-4">
              {result.history.map((h, i) => (
                <li key={i} className="text-sm"><p className="text-xs text-slate-400">{formatDateTime(h.at)}</p><p className="whitespace-pre-line text-slate-700">{h.note}</p></li>
              ))}
            </ol>
          )}
          <p className="mt-5 text-xs text-slate-400">Diajukan {formatDateTime(result.created_at)} · diperbarui {formatDateTime(result.updated_at)}</p>
        </article>
      )}
    </div>
  )
}
