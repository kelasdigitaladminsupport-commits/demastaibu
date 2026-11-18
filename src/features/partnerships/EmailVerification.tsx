import { useEffect, useState } from 'react'
import { BadgeCheck, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { requestPartnershipEmailCode, verifyPartnershipEmailCode } from '../../services/partnerships'

const COOLDOWN_SECONDS = 60
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export interface EmailProof { email: string; token: string }

interface Props {
  /** Isi kolom email saat ini. */
  email: string
  proof: EmailProof | null
  onVerified: (proof: EmailProof) => void
  /** Pengaju memilih mengganti email: bukti dibuang dan kolom email dapat diubah lagi. */
  onReset: () => void
  error?: string
}

/** Tombol "Verifikasi email" + kolom kode OTP, ditaruh tepat di bawah kolom email formulir. */
export function EmailVerification({ email, proof, onVerified, onReset, error }: Props) {
  const normalized = email.trim().toLowerCase()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const verified = proof !== null && proof.email === normalized
  const codeSent = sentTo === normalized && !verified

  async function send() {
    setSending(true); setMsg(null)
    try {
      await requestPartnershipEmailCode(normalized)
      setSentTo(normalized); setCode(''); setCooldown(COOLDOWN_SECONDS)
      toast.success('Kode verifikasi telah dikirim ke email Anda.')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal mengirim kode.') } finally { setSending(false) }
  }

  async function check() {
    if (!/^\d{6}$/.test(code)) { setMsg('Masukkan kode 6 digit dari email.'); return }
    setBusy(true); setMsg(null)
    try {
      const token = await verifyPartnershipEmailCode(normalized, code)
      onVerified({ email: normalized, token }); setSentTo(null); setCode('')
      toast.success('Email berhasil diverifikasi.')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Verifikasi gagal.') } finally { setBusy(false) }
  }

  if (verified) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800"><BadgeCheck className="size-4" aria-hidden /> Email terverifikasi</span>
        <button type="button" onClick={onReset} className="text-slate-600 hover:underline">Ganti email</button>
      </div>
    )
  }

  const shownError = msg ?? error
  return (
    <div className="mt-2 space-y-2">
      {!codeSent && (
        <Button variant="outline" size="sm" loading={sending} disabled={!EMAIL_RE.test(normalized) || cooldown > 0} onClick={send}>
          <MailCheck className="size-4" aria-hidden /> {cooldown > 0 ? `Verifikasi email (${cooldown} dtk)` : 'Verifikasi email'}
        </Button>
      )}
      {codeSent && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
          <p className="text-xs text-slate-600">Kode 6 digit telah dikirim ke <strong>{normalized}</strong> dan berlaku 10 menit. Periksa folder spam bila belum terlihat.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Kode verifikasi email" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
              className={`${inputClass} w-40 text-center font-mono text-lg tracking-[0.3em]`} value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setMsg(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void check() } }}
            />
            <Button size="sm" loading={busy} disabled={code.length !== 6} onClick={check}>Verifikasi</Button>
          </div>
          <button type="button" onClick={send} disabled={cooldown > 0 || sending}
            className="text-sm font-medium text-emerald-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
            {sending ? 'Mengirim…' : cooldown > 0 ? `Kirim ulang kode (${cooldown} dtk)` : 'Kirim ulang kode'}
          </button>
        </div>
      )}
      {shownError && <p role="alert" className="text-xs font-medium text-red-600">{shownError}</p>}
    </div>
  )
}
