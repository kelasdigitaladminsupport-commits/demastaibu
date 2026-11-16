import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Field, inputClass } from '../../components/ui/Field'
import { CLASS_SCHEDULES } from './constants'

export interface ApplicantValues {
  fullName: string; birthPlace: string; birthDate: string; gender: string; email: string; phone: string
  address: string; previousSchool: string; graduationYear: string; guardianName: string; guardianPhone: string
  classSchedule: string
}

export function ApplicantFields({ register, errors }: { register: UseFormRegister<ApplicantValues>; errors: FieldErrors<ApplicantValues> }) {
  const max = (n: number) => ({ maxLength: { value: n, message: `Maksimal ${n} karakter` } })
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <fieldset className="sm:col-span-2" aria-describedby={errors.classSchedule ? 'classSchedule-error' : undefined}>
        <legend className="text-sm font-medium text-slate-700">Jadwal perkuliahan *</legend>
        <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
          {CLASS_SCHEDULES.map((s) => (
            <label key={s.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white p-3.5 text-sm has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600/30">
              <input type="radio" value={s.value} className="mt-0.5 size-4 accent-emerald-700" {...register('classSchedule', { required: 'Pilih jadwal perkuliahan' })} />
              <span><span className="block font-semibold text-slate-900">{s.label}</span><span className="block text-slate-600">{s.time}</span></span>
            </label>
          ))}
        </div>
        {errors.classSchedule && <p id="classSchedule-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errors.classSchedule.message}</p>}
      </fieldset>
      <Field label="Nama lengkap *" htmlFor="fullName" error={errors.fullName?.message}>
        <input id="fullName" autoComplete="name" className={inputClass} {...register('fullName', { required: 'Wajib diisi', minLength: { value: 2, message: 'Minimal 2 karakter' }, ...max(150) })} />
      </Field>
      <Field label="Email *" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email', { required: 'Wajib diisi', pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Format email tidak valid' } })} />
      </Field>
      <Field label="Tempat lahir" htmlFor="birthPlace" error={errors.birthPlace?.message}><input id="birthPlace" className={inputClass} {...register('birthPlace', max(100))} /></Field>
      <Field label="Tanggal lahir" htmlFor="birthDate" error={errors.birthDate?.message}><input id="birthDate" type="date" className={inputClass} {...register('birthDate')} /></Field>
      <Field label="Jenis kelamin" htmlFor="gender">
        <select id="gender" className={inputClass} {...register('gender')}><option value="">—</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select>
      </Field>
      <Field label="Telepon / WhatsApp *" htmlFor="phone" error={errors.phone?.message}>
        <input id="phone" autoComplete="tel" className={inputClass} {...register('phone', { required: 'Wajib diisi', ...max(30) })} />
      </Field>
      <div className="sm:col-span-2"><Field label="Alamat" htmlFor="address" error={errors.address?.message}><textarea id="address" rows={2} className={inputClass} {...register('address', max(500))} /></Field></div>
      <Field label="Asal sekolah" htmlFor="previousSchool" error={errors.previousSchool?.message}><input id="previousSchool" className={inputClass} {...register('previousSchool', max(150))} /></Field>
      <Field label="Tahun lulus" htmlFor="graduationYear" error={errors.graduationYear?.message}>
        <input id="graduationYear" type="number" inputMode="numeric" className={inputClass} {...register('graduationYear', { min: { value: 1980, message: 'Tahun tidak valid' }, max: { value: 2100, message: 'Tahun tidak valid' } })} />
      </Field>
      <Field label="Nama orang tua / wali" htmlFor="guardianName" error={errors.guardianName?.message}><input id="guardianName" className={inputClass} {...register('guardianName', max(150))} /></Field>
      <Field label="Telepon orang tua / wali" htmlFor="guardianPhone" error={errors.guardianPhone?.message}><input id="guardianPhone" className={inputClass} {...register('guardianPhone', max(30))} /></Field>
    </div>
  )
}
