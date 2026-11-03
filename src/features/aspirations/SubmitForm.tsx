import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Copy, Info, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { submitAspiration, uploadAttachment } from '../../services/aspirations'
import { CATEGORIES } from './constants'

interface Values { category: string; title: string; content: string; mode: 'anonymous' | 'named'; name: string; contact: string; website: string }

export function SubmitForm({ onTrack }: { onTrack: (code: string) => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const [ticket, setTicket] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    defaultValues: { category: 'saran', mode: 'anonymous' },
  })
  const mode = watch('mode')
  const anonymous = mode === 'anonymous'

  async function onSubmit(v: Values) {
    if (v.website) return // honeypot
    try {
      let attachmentPath: string | null = null
      if (file && user && !anonymous) attachmentPath = await uploadAttachment(file, user.id)
      const code = await submitAspiration({
        title: v.title.trim(), content: v.content.trim(), category: v.category, isAnonymous: anonymous,
        name: anonymous ? undefined : v.name.trim(), contact: anonymous ? undefined : v.contact.trim(), attachmentPath,
      })
      setTicket(code); setFile(null); reset({ category: 'saran', mode: 'anonymous' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Aspirasi gagal dikirim.')
    }
  }

  if (ticket) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-12 text-emerald-700" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-semibold text-emerald-950">Aspirasi terkirim</h2>
        <p className="mt-1 text-sm text-slate-600">Simpan kode tiket berikut. Kode ini satu-satunya cara memantau tanggapan, terutama untuk kiriman anonim.</p>
        <p className="mx-auto mt-4 w-fit rounded-xl border-2 border-dashed border-emerald-600 bg-white px-6 py-3 font-mono text-2xl font-bold tracking-wider text-emerald-900">{ticket}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(ticket); toast.success('Kode disalin.') } catch { toast.error('Gagal menyalin.') } }}><Copy className="size-4" /> Salin kode</Button>
          <Button onClick={() => onTrack(ticket)}>Lacak status</Button>
          <Button variant="ghost" onClick={() => setTicket(null)}>Kirim aspirasi lain</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>Pengiriman anonim tidak meminta identitas Anda. Namun penyedia infrastruktur dapat mencatat metadata teknis (misalnya alamat IP) pada log mereka, sehingga anonimitas teknis mutlak tidak dapat dijanjikan. Baca <Link to="/kebijakan-privasi" className="font-semibold underline">Kebijakan Privasi</Link>.</p>
      </div>

      <Field label="Kategori *" htmlFor="category">
        <select id="category" className={inputClass} {...register('category', { required: true })}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Judul *" htmlFor="title" error={errors.title?.message}>
        <input id="title" className={inputClass} {...register('title', { required: 'Wajib diisi', minLength: { value: 3, message: 'Minimal 3 karakter' }, maxLength: { value: 150, message: 'Maksimal 150 karakter' } })} />
      </Field>
      <Field label="Isi aspirasi *" htmlFor="content" error={errors.content?.message} hint="Jelaskan dengan jelas dan sopan. Maksimal 5000 karakter.">
        <textarea id="content" rows={7} className={inputClass} {...register('content', { required: 'Wajib diisi', minLength: { value: 5, message: 'Minimal 5 karakter' }, maxLength: { value: 5000, message: 'Maksimal 5000 karakter' } })} />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Identitas</legend>
        <label className="flex items-start gap-3"><input type="radio" value="anonymous" className="mt-1" {...register('mode')} />
          <span className="text-sm"><strong>Anonim</strong> — nama dan kontak tidak disimpan.</span></label>
        <label className="flex items-start gap-3"><input type="radio" value="named" className="mt-1" {...register('mode')} />
          <span className="text-sm"><strong>Cantumkan identitas</strong> — agar pengelola dapat menghubungi Anda. Identitas tidak ditampilkan di publik.</span></label>
      </fieldset>

      {!anonymous && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nama (opsional)" htmlFor="name" error={errors.name?.message}>
            <input id="name" className={inputClass} {...register('name', { maxLength: { value: 120, message: 'Maksimal 120 karakter' } })} />
          </Field>
          <Field label="Kontak: email/WhatsApp (opsional)" htmlFor="contact" error={errors.contact?.message}>
            <input id="contact" className={inputClass} {...register('contact', { maxLength: { value: 150, message: 'Maksimal 150 karakter' } })} />
          </Field>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-slate-700">Lampiran (opsional)</p>
        {anonymous ? (
          <p className="mt-1 text-xs text-slate-500">Lampiran tidak tersedia untuk kiriman anonim.</p>
        ) : !user ? (
          <p className="mt-1 text-xs text-slate-500">Untuk melampirkan berkas, <Link to="/masuk" state={{ from: location.pathname }} className="font-semibold text-emerald-800 underline">masuk</Link> terlebih dahulu. Format JPG/PNG/WebP/PDF, maksimal 5 MB.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /> {file ? 'Ganti berkas' : 'Pilih berkas'}</Button>
            {file && <span className="inline-flex items-center gap-1 text-sm text-slate-600">{file.name}
              <button type="button" aria-label="Hapus lampiran" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}><X className="size-4" /></button></span>}
          </div>
        )}
      </div>

      <div aria-hidden className="absolute -left-[9999px]"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
      <Button type="submit" loading={isSubmitting}>Kirim aspirasi</Button>
    </form>
  )
}
