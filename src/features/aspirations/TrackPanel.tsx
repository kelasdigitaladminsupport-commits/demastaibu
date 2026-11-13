import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Loading'
import { useAuth } from '../../hooks/useAuth'
import { fetchMyAspirations, trackAspiration, type TrackResult } from '../../services/aspirations'
import { formatDateTime } from '../../utils/format'
import { CATEGORY_LABEL, STATUS_CLS, STATUS_LABEL } from './constants'

export function TrackPanel({ initialCode = '' }: { initialCode?: string }) {
  const { user } = useAuth()
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<TrackResult | null | undefined>(undefined)

  const track = useMutation({
    mutationFn: (c: string) => trackAspiration(c),
    onSuccess: (r) => setResult(r),
    onError: (e) => { setResult(undefined); toast.error(e instanceof Error ? e.message : 'Gagal melacak.') },
  })

  useEffect(() => { if (initialCode) { setCode(initialCode); track.mutate(initialCode) } }, [initialCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const mine = useQuery({ queryKey: ['my-aspirations', user?.id], queryFn: fetchMyAspirations, enabled: Boolean(user) })

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) track.mutate(code) }} className="flex flex-col gap-3 sm:flex-row">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Contoh: ASP-XXXXXXXX" aria-label="Kode tiket"
          className={`${inputClass} font-mono tracking-wider sm:max-w-sm`} maxLength={30} />
        <Button type="submit" loading={track.isPending} disabled={!code.trim()}>Lacak</Button>
      </form>

      {track.isPending && <Spinner />}
      {result === null && <EmptyState icon={SearchX} title="Tiket tidak ditemukan" description="Periksa kembali kode tiket Anda (huruf dan angka)." />}

      {result && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-mono text-sm text-slate-500">{result.ticket_code} · {CATEGORY_LABEL[result.category] ?? result.category}</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">{result.title}</h2>
          <p className="mt-3"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLS[result.status] ?? ''}`}>{STATUS_LABEL[result.status] ?? result.status}</span></p>
          {result.status_reason && <p className="mt-3 text-sm text-slate-700"><strong>Keterangan:</strong> {result.status_reason}</p>}
          {result.public_response && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Tanggapan pengurus</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{result.public_response}</p>
            </div>
          )}
          {result.history.length > 0 && (
            <ol className="mt-5 space-y-3 border-l-2 border-emerald-200 pl-4">
              {result.history.map((h, i) => (
                <li key={i} className="text-sm">
                  <p className="text-xs text-slate-400">{formatDateTime(h.at)}</p>
                  <p className="text-slate-700">{h.note}</p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-5 text-xs text-slate-400">Diajukan {formatDateTime(result.created_at)} · diperbarui {formatDateTime(result.updated_at)}</p>
        </article>
      )}

      {user && (mine.data?.length ?? 0) > 0 && (
        <section>
          <h3 className="font-display text-lg font-semibold text-emerald-950">Aspirasi saya</h3>
          <p className="text-xs text-slate-500">Hanya aspirasi yang Anda kirim dengan identitas. Kiriman anonim sengaja tidak terhubung ke akun.</p>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {mine.data?.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <button type="button" className="text-left font-medium text-emerald-800 hover:underline" onClick={() => { setCode(a.ticket_code); track.mutate(a.ticket_code) }}>{a.title}</button>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[a.status] ?? ''}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!user && <p className="text-xs text-slate-500">Punya akun? <Link to="/masuk" className="font-semibold text-emerald-800 underline">Masuk</Link> untuk melihat aspirasi yang Anda kirim dengan identitas.</p>}
    </div>
  )
}
