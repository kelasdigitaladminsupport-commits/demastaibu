import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { PageLoading } from '../../components/ui/Loading'
import { useAuth } from '../../hooks/useAuth'
import { updatePassword } from '../../services/auth'
import { passwordSchema } from '../../utils/validation'

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Kata sandi tidak sama' })
type Values = z.infer<typeof schema>

/** Tautan pemulihan dari email membuat sesi sementara; di sini pengguna menetapkan kata sandi baru. */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  if (loading) return <PageLoading label="Memverifikasi tautan…" />
  if (!user) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-emerald-950">Tautan tidak valid</h1>
        <p className="mt-2 text-sm text-slate-600">Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru.</p>
        <Link to="/lupa-password" className="mt-6 inline-block text-sm font-semibold text-emerald-800 hover:underline">Minta tautan baru</Link>
      </div>
    )
  }

  async function onSubmit(v: Values) {
    try {
      await updatePassword(v.password)
      toast.success('Kata sandi berhasil diubah.')
      navigate('/', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah kata sandi.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <h1 className="font-display text-2xl font-bold text-emerald-950">Kata sandi baru</h1>
      <Field label="Kata sandi baru" htmlFor="password" error={errors.password?.message} hint="Minimal 8 karakter, kombinasi huruf dan angka.">
        <input id="password" type="password" autoComplete="new-password" className={inputClass} {...register('password')} />
      </Field>
      <Field label="Ulangi kata sandi" htmlFor="confirm" error={errors.confirm?.message}>
        <input id="confirm" type="password" autoComplete="new-password" className={inputClass} {...register('confirm')} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>Simpan</Button>
    </form>
  )
}
