import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { EmailCodeForm } from '../../features/auth/EmailCodeForm'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { emailSchema } from '../../utils/validation'

/** Untuk pengguna yang sudah mendaftar tetapi emailnya belum terverifikasi (mis. diarahkan dari halaman masuk). */
export function VerifyEmailPage() {
  useDocumentTitle('Verifikasi Email')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initial = params.get('email') ?? ''
  const [email, setEmail] = useState(emailSchema.safeParse(initial).success ? initial : '')
  const [step, setStep] = useState<'email' | 'code'>(emailSchema.safeParse(initial).success ? 'code' : 'email')
  const [error, setError] = useState<string | undefined>()

  if (step === 'code') {
    return <EmailCodeForm email={email} sendOnMount onVerified={() => navigate('/', { replace: true })} onChangeEmail={() => setStep('email')} />
  }

  return (
    <form className="space-y-5" noValidate onSubmit={(e) => {
      e.preventDefault()
      const ok = emailSchema.safeParse(email.trim())
      if (!ok.success) { setError(ok.error.issues[0]?.message ?? 'Email tidak valid'); return }
      setError(undefined); setEmail(email.trim()); setStep('code')
    }}>
      <div>
        <h1 className="font-display text-2xl font-bold text-emerald-950">Verifikasi email</h1>
        <p className="mt-1 text-sm text-slate-600">Masukkan email akun Anda. Kami akan mengirim kode verifikasi baru.</p>
      </div>
      <Field label="Email" htmlFor="email" error={error}>
        <input id="email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full">Kirim kode</Button>
      <p className="text-center text-sm"><Link to="/masuk" className="text-emerald-800 hover:underline">Kembali ke halaman masuk</Link></p>
    </form>
  )
}
