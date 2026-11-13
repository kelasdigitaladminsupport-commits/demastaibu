import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { requestPasswordReset } from '../../services/auth'
import { emailSchema } from '../../utils/validation'

const schema = z.object({ email: emailSchema })
type Values = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(v: Values) {
    try { await requestPasswordReset(v.email); setDone(true) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal mengirim tautan.') }
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-emerald-950">Periksa email Anda</h1>
        <p className="mt-2 text-sm text-slate-600">Jika email terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim.</p>
        <Link to="/masuk" className="mt-6 inline-block text-sm font-semibold text-emerald-800 hover:underline">Kembali ke halaman masuk</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold text-emerald-950">Lupa kata sandi</h1>
        <p className="mt-1 text-sm text-slate-600">Masukkan email akun Anda untuk menerima tautan pengaturan ulang.</p>
      </div>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>Kirim tautan</Button>
      <p className="text-center text-sm"><Link to="/masuk" className="text-emerald-800 hover:underline">Kembali</Link></p>
    </form>
  )
}
