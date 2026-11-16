import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, MailCheck, TriangleAlert } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Container } from '../../components/ui/Container'
import { PageHeader } from '../../components/ui/PageHeader'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { verifyPartnershipEmail } from '../../services/partnerships'

/**
 * Verifikasi email pengajuan kolaborasi. Verifikasi HANYA terjadi saat tombol ditekan:
 * pemindai tautan email (antivirus/prefetch) hanya membuka halaman dan tidak menekan tombol,
 * sehingga tautan satu-kali tidak habis terpakai sebelum pemiliknya membukanya.
 */
export function PartnershipVerifyPage() {
  useDocumentTitle('Verifikasi Email Kolaborasi')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<{ kind: 'idle' | 'busy' } | { kind: 'ok'; ref: string } | { kind: 'error'; message: string }>({ kind: 'idle' })
  const valid = /^[0-9a-f]{48}$/.test(token)

  async function verify() {
    setState({ kind: 'busy' })
    try { setState({ kind: 'ok', ref: await verifyPartnershipEmail(token) }) }
    catch (e) { setState({ kind: 'error', message: e instanceof Error ? e.message : 'Verifikasi gagal.' }) }
  }

  return (
    <>
      <PageHeader title="Verifikasi Email" description="Konfirmasi bahwa alamat email pada pengajuan kolaborasi adalah milik Anda." />
      <Container className="max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          {state.kind === 'ok' ? (
            <>
              <CheckCircle2 className="mx-auto size-12 text-emerald-700" aria-hidden />
              <h2 className="mt-3 font-display text-xl font-semibold text-emerald-950">Email terverifikasi</h2>
              <p className="mt-1 text-sm text-slate-600">Terima kasih. Email konfirmasi untuk nomor referensi <strong className="font-mono">{state.ref}</strong> sedang dikirim ke kotak masuk Anda.</p>
              <Link to="/kolaborasi" className="mt-5 inline-block text-sm font-medium text-emerald-800 hover:underline">Ke halaman kolaborasi</Link>
            </>
          ) : !valid ? (
            <>
              <TriangleAlert className="mx-auto size-12 text-amber-600" aria-hidden />
              <h2 className="mt-3 font-display text-xl font-semibold text-slate-900">Tautan tidak valid</h2>
              <p className="mt-1 text-sm text-slate-600">Tautan verifikasi tidak lengkap. Buka kembali tautan dari email Anda.</p>
            </>
          ) : (
            <>
              <MailCheck className="mx-auto size-12 text-emerald-700" aria-hidden />
              <h2 className="mt-3 font-display text-xl font-semibold text-emerald-950">Verifikasi email Anda</h2>
              <p className="mt-1 text-sm text-slate-600">Tekan tombol di bawah untuk memastikan Anda adalah pemilik email yang dipakai pada pengajuan kolaborasi.</p>
              {state.kind === 'error' && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{state.message}</p>}
              <Button className="mt-5" onClick={verify} disabled={state.kind === 'busy'}>{state.kind === 'busy' ? 'Memverifikasi…' : 'Verifikasi email saya'}</Button>
            </>
          )}
        </div>
      </Container>
    </>
  )
}
