import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { settingObject } from '../../features/settings/helpers'
import { SOCIAL_BY_KEY, safeUrl } from '../../features/branding/socials'
import { submitContactMessage } from '../../services/content'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { emailSchema } from '../../utils/validation'

const schema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120, 'Maksimal 120 karakter'),
  email: emailSchema,
  subject: z.string().trim().min(3, 'Subjek minimal 3 karakter').max(200, 'Maksimal 200 karakter'),
  message: z.string().trim().min(5, 'Pesan minimal 5 karakter').max(4000, 'Maksimal 4000 karakter'),
  website: z.string().max(0).optional(), // honeypot: harus kosong
})
type Values = z.infer<typeof schema>

export function ContactPage() {
  useDocumentTitle('Kontak')
  const [sent, setSent] = useState(false)
  const settings = useSiteSettings()
  const contact = settingObject(settings.data, 'contact')
  const social = settingObject(settings.data, 'social_links')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(v: Values) {
    if (v.website) return // bot
    try {
      await submitContactMessage({ name: v.name, email: v.email, subject: v.subject, message: v.message })
      setSent(true); reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Pesan gagal dikirim.')
    }
  }

  const hasInfo = contact.email || contact.phone || contact.address || Object.keys(social).length > 0

  return (
    <>
      <PageHeader title="Kontak" description="Hubungi pengurus DEMA." />
      <Container className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-emerald-700" aria-hidden />
              <h2 className="mt-3 font-display text-xl font-semibold text-emerald-950">Pesan terkirim</h2>
              <p className="mt-1 text-sm text-slate-600">Terima kasih. Pengurus akan menindaklanjuti pesan Anda.</p>
              <Button variant="outline" className="mt-5" onClick={() => setSent(false)}>Kirim pesan lain</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nama" htmlFor="name" error={errors.name?.message}>
                  <input id="name" autoComplete="name" className={inputClass} {...register('name')} />
                </Field>
                <Field label="Email" htmlFor="email" error={errors.email?.message}>
                  <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />
                </Field>
              </div>
              <Field label="Subjek" htmlFor="subject" error={errors.subject?.message}>
                <input id="subject" className={inputClass} {...register('subject')} />
              </Field>
              <Field label="Pesan" htmlFor="message" error={errors.message?.message}>
                <textarea id="message" rows={6} className={inputClass} {...register('message')} />
              </Field>
              <div aria-hidden className="absolute -left-[9999px]">
                <label>Jangan diisi<input tabIndex={-1} autoComplete="off" {...register('website')} /></label>
              </div>
              <Button type="submit" loading={isSubmitting}>Kirim pesan</Button>
            </form>
          )}
        </div>

        <aside className="space-y-4 text-sm">
          <h2 className="font-display text-lg font-semibold text-emerald-950">Informasi kontak</h2>
          {!hasInfo && <p className="text-slate-500">Informasi kontak resmi belum diisi. Silakan gunakan formulir.</p>}
          {contact.email && <p className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-emerald-700" /><a className="hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>}
          {contact.phone && <p className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-emerald-700" /> {contact.phone}</p>}
          {contact.address && <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-700" /> {contact.address}</p>}
          {Object.entries(social).map(([name, url]) => ({ name, label: SOCIAL_BY_KEY[name]?.label ?? name, href: safeUrl(url) })).filter((x) => x.href).map((x) => (
            <p key={x.name}><a href={x.href as string} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-emerald-800 hover:underline">{x.label}</a></p>
          ))}
        </aside>
      </Container>
    </>
  )
}
