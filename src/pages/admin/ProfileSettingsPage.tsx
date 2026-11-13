import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { PageLoading } from '../../components/ui/Loading'
import { fetchAllSettings, saveSettings, str } from '../../services/adminSettings'
import { describeDbError } from '../../services/adminErrors'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

interface Values { about: string; vision: string; mission: string }

export function ProfileSettingsPage() {
  useDocumentTitle('Profil, Visi & Misi — Admin')
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: fetchAllSettings })
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty, errors } } = useForm<Values>({
    defaultValues: { about: '', vision: '', mission: '' },
  })

  useEffect(() => {
    if (!q.data) return
    const m = q.data.mission
    const lines = Array.isArray(m) ? m.filter((x): x is string => typeof x === 'string') : str(m).split(/\n+/)
    reset({ about: str(q.data.about), vision: str(q.data.vision), mission: lines.join('\n') })
  }, [q.data, reset])

  async function onSubmit(v: Values) {
    try {
      await saveSettings([
        { key: 'about', value: v.about.trim(), is_public: true },
        { key: 'vision', value: v.vision.trim(), is_public: true },
        { key: 'mission', value: v.mission.split(/\n+/).map((x) => x.trim()).filter(Boolean), is_public: true },
      ])
      toast.success('Profil, visi, dan misi disimpan.')
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      qc.invalidateQueries({ queryKey: ['site_settings'] })
      reset(v)
    } catch (e) {
      toast.error(describeDbError(e))
    }
  }

  if (q.isLoading) return <PageLoading />
  if (q.error) return <p className="text-sm text-red-600">Pengaturan tidak dapat dimuat.</p>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Profil, Visi & Misi</h1>
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <Field label="Profil DEMA" htmlFor="about" error={errors.about?.message} hint="Pisahkan paragraf dengan satu baris kosong. Tampil di halaman Profil.">
          <textarea id="about" rows={10} className={inputClass} {...register('about', { maxLength: { value: 8000, message: 'Maksimal 8000 karakter' } })} />
        </Field>
        <Field label="Visi" htmlFor="vision" error={errors.vision?.message}>
          <textarea id="vision" rows={4} className={inputClass} {...register('vision', { maxLength: { value: 2000, message: 'Maksimal 2000 karakter' } })} />
        </Field>
        <Field label="Misi" htmlFor="mission" error={errors.mission?.message} hint="Satu misi per baris. Nomor ditambahkan otomatis.">
          <textarea id="mission" rows={8} className={inputClass} {...register('mission', { maxLength: { value: 6000, message: 'Maksimal 6000 karakter' } })} />
        </Field>
      </div>
      <div className="flex justify-end"><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Simpan</Button></div>
    </form>
  )
}
