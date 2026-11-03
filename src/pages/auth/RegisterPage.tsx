import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { signUp } from '../../services/auth'
import { emailSchema, passwordSchema } from '../../utils/validation'

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120, 'Maksimal 120 karakter'),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Kata sandi tidak sama' })
type Values = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(v: Values) {
    try {
      const { needsEmailConfirmation } = await signUp(v.fullName, v.email, v.password)
      if (needsEmailConfirmation) setSentTo(v.email)
      else { toast.success('Akun berhasil dibuat.'); navigate('/') }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mendaftar.')
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-12 text-emerald-700" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold text-emerald-950">Periksa email Anda</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kami mengirim tautan verifikasi ke <strong>{sentTo}</strong>. Klik tautan tersebut, lalu masuk.
        </p>
        <Link to="/masuk" className="mt-6 inline-block text-sm font-semibold text-emerald-800 hover:underline">Ke halaman masuk</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold text-emerald-950">Buat akun</h1>
        <p className="mt-1 text-sm text-slate-600">Akun dibutuhkan untuk forum dan pendaftaran PMB.</p>
      </div>
      <Field label="Nama lengkap" htmlFor="fullName" error={errors.fullName?.message}>
        <input id="fullName" autoComplete="name" className={inputClass} {...register('fullName')} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />
      </Field>
      <Field label="Kata sandi" htmlFor="password" error={errors.password?.message} hint="Minimal 8 karakter, kombinasi huruf dan angka.">
        <input id="password" type="password" autoComplete="new-password" className={inputClass} {...register('password')} />
      </Field>
      <Field label="Ulangi kata sandi" htmlFor="confirm" error={errors.confirm?.message}>
        <input id="confirm" type="password" autoComplete="new-password" className={inputClass} {...register('confirm')} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>Daftar</Button>
      <p className="text-center text-sm text-slate-600">
        Sudah punya akun? <Link to="/masuk" className="font-semibold text-emerald-800 hover:underline">Masuk</Link>
      </p>
    </form>
  )
}
