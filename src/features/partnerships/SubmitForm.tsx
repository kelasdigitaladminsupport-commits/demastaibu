import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Copy, Info, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { submitPartnership, uploadProposal } from '../../services/partnerships'
import { COOPERATION_SUGGESTIONS, PARTNER_TYPES } from './constants'

interface Values {
  orgName: string; contactPerson: string; email: string; phone: string; partnerType: string; cooperationType: string
  supportedProgram: string; supportForm: string; supportValue: string; message: string; publishConsent: boolean; website: string
}

export function SubmitForm({ onTrack }: { onTrack: (ref: string, email: string) => void }) {
  const [done, setDone] = useState<{ ref: string; email: string } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: { partnerType: 'sponsor', publishConsent: false } })

  async function onSubmit(v: Values) {
    if (v.website) return // honeypot
    try {
      const proposalPath = file ? await uploadProposal(file) : null
      const value = v.supportValue.trim() === '' ? null : Number(v.supportValue)
      const ref = await submitPartnership({
        orgName: v.orgName.trim(), contactPerson: v.contactPerson.trim(), email: v.email.trim(), phone: v.phone.trim(),
        partnerType: v.partnerType, cooperationType: v.cooperationType.trim(), supportedProgram: v.supportedProgram.trim(),
        supportForm: v.supportForm.trim(), supportValue: value, message: v.message.trim(), publishConsent: v.publishConsent, proposalPath,
      })
      setDone({ ref, email: v.email.trim() }); setFile(null); reset()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Permohonan gagal dikirim.') }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-12 text-emerald-700" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-semibold text-emerald-950">Permohonan terkirim</h2>
        <p className="mt-1 text-sm text-slate-600">Simpan nomor referensi ini. Untuk melacak status Anda memerlukan nomor referensi <em>dan</em> email yang Anda isi.</p>
        <p className="mx-auto mt-4 w-fit rounded-xl border-2 border-dashed border-emerald-600 bg-white px-6 py-3 font-mono text-2xl font-bold tracking-wider text-emerald-900">{done.ref}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(done.ref); toast.success('Nomor disalin.') } catch { toast.error('Gagal menyalin.') } }}><Copy className="size-4" /> Salin nomor</Button>
          <Button onClick={() => onTrack(done.ref, done.email)}>Lacak status</Button>
          <Button variant="ghost" onClick={() => setDone(null)}>Ajukan lagi</Button>
        </div>
      </div>
    )
  }

  const req = { required: 'Wajib diisi' }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>Formulir ini hanya untuk mengajukan kerja sama. Website <strong>tidak memproses pembayaran</strong>. Pengelola akan menghubungi Anda melalui email untuk pembahasan lebih lanjut.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama individu / lembaga *" htmlFor="orgName" error={errors.orgName?.message}>
          <input id="orgName" className={inputClass} {...register('orgName', { ...req, minLength: { value: 2, message: 'Minimal 2 karakter' }, maxLength: { value: 200, message: 'Maksimal 200 karakter' } })} />
        </Field>
        <Field label="Jenis mitra *" htmlFor="partnerType">
          <select id="partnerType" className={inputClass} {...register('partnerType')}>{PARTNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        </Field>
        <Field label="Narahubung *" htmlFor="contactPerson" error={errors.contactPerson?.message}>
          <input id="contactPerson" autoComplete="name" className={inputClass} {...register('contactPerson', { ...req, minLength: { value: 2, message: 'Minimal 2 karakter' }, maxLength: { value: 120, message: 'Maksimal 120 karakter' } })} />
        </Field>
        <Field label="Email *" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email', { ...req, pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Format email tidak valid' } })} />
        </Field>
        <Field label="Telepon / WhatsApp" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" autoComplete="tel" className={inputClass} {...register('phone', { maxLength: { value: 30, message: 'Maksimal 30 karakter' } })} />
        </Field>
        <Field label="Jenis kerja sama *" htmlFor="cooperationType" error={errors.cooperationType?.message}>
          <input id="cooperationType" list="coop-suggestions" className={inputClass} {...register('cooperationType', { ...req, maxLength: { value: 150, message: 'Maksimal 150 karakter' } })} />
          <datalist id="coop-suggestions">{COOPERATION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Program yang ingin didukung" htmlFor="supportedProgram" error={errors.supportedProgram?.message}>
          <input id="supportedProgram" className={inputClass} {...register('supportedProgram', { maxLength: { value: 200, message: 'Maksimal 200 karakter' } })} />
        </Field>
        <Field label="Bentuk bantuan" htmlFor="supportForm" error={errors.supportForm?.message} hint="Contoh: dana, barang, tempat, jasa.">
          <input id="supportForm" className={inputClass} {...register('supportForm', { maxLength: { value: 200, message: 'Maksimal 200 karakter' } })} />
        </Field>
        <Field label="Perkiraan nilai dukungan (Rp, opsional)" htmlFor="supportValue" error={errors.supportValue?.message}>
          <input id="supportValue" type="number" min={0} inputMode="numeric" className={inputClass} {...register('supportValue', { min: { value: 0, message: 'Tidak boleh negatif' } })} />
        </Field>
      </div>

      <Field label="Pesan *" htmlFor="message" error={errors.message?.message}>
        <textarea id="message" rows={6} className={inputClass} {...register('message', { ...req, minLength: { value: 5, message: 'Minimal 5 karakter' }, maxLength: { value: 4000, message: 'Maksimal 4000 karakter' } })} />
      </Field>

      <div>
        <p className="text-sm font-medium text-slate-700">Proposal (PDF, maks. 5 MB, opsional)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /> {file ? 'Ganti berkas' : 'Pilih PDF'}</Button>
          {file && <span className="inline-flex items-center gap-1 text-sm text-slate-600">{file.name}
            <button type="button" aria-label="Hapus berkas" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}><X className="size-4" /></button></span>}
        </div>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-4 rounded border-slate-300 text-emerald-700" {...register('publishConsent')} />
        <span className="text-sm text-slate-700">Saya mengizinkan nama/logo lembaga atau individu ditampilkan di halaman Mitra apabila kerja sama disetujui. <span className="text-slate-500">(Opsional. Tanpa centang, nama Anda tidak akan dipublikasikan.)</span></span>
      </label>

      <div aria-hidden className="absolute -left-[9999px]"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
      <Button type="submit" loading={isSubmitting}>Kirim permohonan</Button>
    </form>
  )
}
