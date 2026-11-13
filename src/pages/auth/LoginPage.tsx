import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { signIn } from '../../services/auth'
import { emailSchema } from '../../utils/validation'

const schema = z.object({ email: emailSchema, password: z.string().min(1, 'Kata sandi wajib diisi') })
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const { user, loading } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  if (!loading && user) return <Navigate to={from} replace />

  async function onSubmit(v: Values) {
    try {
      await signIn(v.email, v.password)
      toast.success('Berhasil masuk.')
      navigate(from, { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal masuk.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold text-emerald-950">Masuk</h1>
        <p className="mt-1 text-sm text-slate-600">Masuk untuk mengelola konten, ikut forum, atau mendaftar PMB.</p>
      </div>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />
      </Field>
      <Field label="Kata sandi" htmlFor="password" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="current-password" className={inputClass} {...register('password')} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>Masuk</Button>
      <div className="flex justify-between text-sm">
        <Link to="/lupa-password" className="text-emerald-800 hover:underline">Lupa kata sandi?</Link>
        <Link to="/daftar" className="text-emerald-800 hover:underline">Buat akun</Link>
      </div>
    </form>
  )
}
