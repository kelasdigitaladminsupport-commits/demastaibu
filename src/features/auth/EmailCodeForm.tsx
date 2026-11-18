import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { resendSignupCode, verifySignupCode } from '../../services/auth'

const COOLDOWN_SECONDS = 60

interface Props {
  email: string
  /** Dipanggil setelah kode benar; sesi pengguna sudah aktif. */
  onVerified: () => void
  /** Kirim kode baru otomatis saat form dibuka (mis. pengguna kembali dari halaman masuk). */
  sendOnMount?: boolean
  onChangeEmail?: () => void
}

/** Form memasukkan kode angka verifikasi email, dengan kirim ulang berjeda 60 detik. */
export function EmailCodeForm({ email, onVerified, sendOnMount = false, onChangeEmail }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  // Setelah mendaftar, kode baru saja dikirim: tunda kirim ulang selama 60 detik.
  const [cooldown, setCooldown] = useState(sendOnMount ? 0 : COOLDOWN_SECONDS)
  const sentOnMount = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend(silent = false) {
    setSending(true); setError(null)
    try {
      await resendSignupCode(email)
      setCooldown(COOLDOWN_SECONDS)
      if (!silent) toast.success('Kode baru telah dikirim.')
      else toast.success('Kode verifikasi dikirim ke email Anda.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim kode.')
    } finally { setSending(false) }
  }

  useEffect(() => {
    if (sendOnMount && !sentOnMount.current) { sentOnMount.current = true; void resend(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{6,10}$/.test(code)) { setError('Masukkan kode angka dari email (6 digit).'); return }
    setBusy(true); setError(null)
    try {
      await verifySignupCode(email, code)
      toast.success('Email terverifikasi. Selamat datang!')
      onVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal.')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 text-center" noValidate>
      <MailCheck className="mx-auto size-12 text-emerald-700" aria-hidden />
      <div>
        <h1 className="font-display text-2xl font-bold text-emerald-950">Masukkan kode verifikasi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kami mengirim kode angka ke <strong>{email}</strong>. Buka email itu lalu masukkan kodenya di bawah. Periksa folder spam bila belum terlihat.
        </p>
        <p className="mt-2 text-xs text-slate-500">Akun yang tidak diverifikasi dalam 24 jam akan dihapus otomatis dan perlu didaftarkan ulang.</p>
      </div>
      <div className="text-left">
        <Field label="Kode verifikasi" htmlFor="otp" error={error ?? undefined}>
          <input
            id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={10} autoFocus
            placeholder="123456"
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" loading={busy} disabled={code.length < 6}>Verifikasi</Button>
      <div className="flex flex-col items-center gap-2 text-sm">
        <button type="button" onClick={() => resend()} disabled={cooldown > 0 || sending}
          className="font-medium text-emerald-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
          {sending ? 'Mengirim…' : cooldown > 0 ? `Kirim ulang kode (${cooldown} dtk)` : 'Kirim ulang kode'}
        </button>
        {onChangeEmail && (
          <button type="button" onClick={onChangeEmail} className="text-slate-600 hover:underline">Ganti alamat email</button>
        )}
      </div>
    </form>
  )
}
