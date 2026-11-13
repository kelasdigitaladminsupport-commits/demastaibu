import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, inputClass } from '../../components/ui/Field'
import { PageLoading } from '../../components/ui/Loading'
import { FileField } from '../../features/admin/FileField'
import { SOCIALS, SocialIcon } from '../../features/branding/socials'
import { fetchAllSettings, obj, saveSettings, str, type SettingEntry } from '../../services/adminSettings'
import { removeFiles } from '../../services/adminStorage'
import { describeDbError } from '../../services/adminErrors'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

interface Values {
  site_logo: string
  contact_email: string; contact_phone: string; contact_address: string
  socials: Record<string, string>
  forum_enabled: boolean; aspiration_enabled: boolean; pmb_enabled: boolean; donation_enabled: boolean
  privacy_policy: string; community_rules: string; donation_info: string
}

const URL_RULE = { pattern: { value: /^https?:\/\/\S+$/i, message: 'Harus diawali http:// atau https://' } }

function Section({ title, children, desc }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-emerald-950">{title}</h2>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function Toggle({ label, hint, ...rest }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1 size-4 rounded border-slate-300 text-emerald-700" {...rest} />
      <span><span className="text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}</span>
    </label>
  )
}

export function SiteSettingsPage() {
  useDocumentTitle('Pengaturan Website — Admin')
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: fetchAllSettings })
  const [pending, setPending] = useState<Values | null>(null)
  const [saving, setSaving] = useState(false)
  const uploads = useRef<string[]>([])    // logo yang diunggah di sesi ini (untuk dibersihkan bila tidak jadi dipakai)
  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Values>()

  function fromSettings(s: Record<string, unknown>): Values {
    const c = obj(s.contact); const so = obj(s.social_links)
    return {
      site_logo: str(s.site_logo),
      contact_email: c.email ?? '', contact_phone: c.phone ?? '', contact_address: c.address ?? '',
      socials: Object.fromEntries(SOCIALS.map((d) => [d.key, so[d.key] ?? ''])),
      forum_enabled: s.forum_enabled === true, aspiration_enabled: s.aspiration_enabled === true,
      pmb_enabled: s.pmb_enabled === true, donation_enabled: s.donation_enabled === true,
      privacy_policy: str(s.privacy_policy), community_rules: str(s.community_rules), donation_info: str(s.donation_info),
    }
  }

  useEffect(() => { if (q.data) reset(fromSettings(q.data)) }, [q.data, reset])

  /** Fitur sensitif yang akan DIHIDUPKAN memerlukan konfirmasi. */
  function onSubmit(v: Values) {
    const was = q.data ?? {}
    const risky = (v.pmb_enabled && was.pmb_enabled !== true) || (v.donation_enabled && was.donation_enabled !== true)
    if (risky) setPending(v)
    else void persist(v)
  }

  async function persist(v: Values) {
    setSaving(true)
    const compact = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, x.trim()]).filter(([, x]) => x))
    const oldLogo = str(q.data?.site_logo)
    const entries: SettingEntry[] = [
      { key: 'site_logo', value: v.site_logo, is_public: true },
      { key: 'contact', value: compact({ email: v.contact_email, phone: v.contact_phone, address: v.contact_address }), is_public: true },
      { key: 'social_links', value: compact(v.socials), is_public: true },
      { key: 'forum_enabled', value: v.forum_enabled, is_public: true },
      { key: 'aspiration_enabled', value: v.aspiration_enabled, is_public: true },
      { key: 'pmb_enabled', value: v.pmb_enabled, is_public: true },
      { key: 'donation_enabled', value: v.donation_enabled, is_public: true },
      { key: 'donation_info', value: v.donation_info.trim(), is_public: true },
      { key: 'privacy_policy', value: v.privacy_policy.trim(), is_public: true },
      { key: 'community_rules', value: v.community_rules.trim(), is_public: true },
    ]
    try {
      await saveSettings(entries)
      // Hapus logo lama dan unggahan sementara yang tidak dipakai (upaya terbaik)
      const unused = [...uploads.current.filter((p) => p !== v.site_logo), ...(oldLogo && oldLogo !== v.site_logo ? [oldLogo] : [])]
      await removeFiles('public-media', unused)
      uploads.current = []
      toast.success('Pengaturan disimpan.')
      // Semua tampilan logo/sosmed membaca 'site_settings' => cukup menyegarkan cache ini agar langsung sinkron.
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      qc.invalidateQueries({ queryKey: ['site_settings'] })
      qc.invalidateQueries({ queryKey: ['pmb'] })
      reset(v)
    } catch (e) {
      toast.error(describeDbError(e))
    } finally {
      setSaving(false); setPending(null)
    }
  }

  if (q.isLoading) return <PageLoading />
  if (q.error) return <p className="text-sm text-red-600">Pengaturan tidak dapat dimuat.</p>

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Pengaturan Website</h1>

      <Section title="Logo website" desc="Logo tampil otomatis di navbar, footer, halaman masuk, dasbor, bukti pendaftaran, ikon tab peramban (favicon), dan data pencarian Google. Satu unggahan, semua tempat ikut berubah.">
        <Controller name="site_logo" control={control}
          render={({ field }) => (
            <FileField kind="image" bucket="public-media" folder="branding" label="Logo website" logoMode
              value={String(field.value ?? '')} onChange={field.onChange} onUploaded={(p) => uploads.current.push(p)} />
          )} />
        <p className="text-xs text-slate-500">Disarankan PNG berlatar transparan, tampak jelas di latar putih maupun hijau tua. Format JPG/PNG/WebP (SVG tidak didukung demi keamanan). Otomatis dikecilkan (maks. 600 px). Gunakan logo resmi organisasi. Klik <strong>Simpan pengaturan</strong> agar perubahan berlaku.</p>
      </Section>

      <Section title="Kontak resmi" desc="Tampil di halaman Kontak. Isi hanya data resmi organisasi; kosongkan bila belum ada.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="contact_email" error={errors.contact_email?.message}>
            <input id="contact_email" type="email" className={inputClass} {...register('contact_email', { pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Format email tidak valid' } })} />
          </Field>
          <Field label="Telepon / WhatsApp" htmlFor="contact_phone" error={errors.contact_phone?.message}>
            <input id="contact_phone" className={inputClass} {...register('contact_phone', { maxLength: { value: 30, message: 'Maksimal 30 karakter' } })} />
          </Field>
        </div>
        <Field label="Alamat" htmlFor="contact_address" error={errors.contact_address?.message}>
          <textarea id="contact_address" rows={3} className={inputClass} {...register('contact_address', { maxLength: { value: 300, message: 'Maksimal 300 karakter' } })} />
        </Field>
      </Section>

      <Section title="Media sosial" desc="Tampil sebagai ikon di bawah logo pada footer dan langsung membuka akun yang ditautkan. Isi tautan lengkap (diawali https://). Kosongkan untuk menyembunyikan ikonnya.">
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <Field key={s.key} label={s.label} htmlFor={`social_${s.key}`} error={errors.socials?.[s.key]?.message}>
              <div className="flex items-center gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800"><SocialIcon path={s.path} /></span>
                <input id={`social_${s.key}`} type="url" placeholder={s.placeholder} className={inputClass} {...register(`socials.${s.key}`, URL_RULE)} />
              </div>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Fitur" desc="Mengatur fitur yang aktif di website.">
        <Toggle label="Forum diskusi aktif" {...register('forum_enabled')} />
        <Toggle label="Formulir aspirasi aktif" {...register('aspiration_enabled')} />
        <Toggle label="Informasi dan pendaftaran PMB aktif" hint="Aktifkan hanya setelah ada persetujuan resmi kampus dan data periode/program studi sudah diisi." {...register('pmb_enabled')} />
        <Toggle label="Halaman donasi dan transparansi aktif" hint="Aktifkan hanya setelah ada kebijakan pengelolaan donasi yang sah. Website tidak memproses pembayaran." {...register('donation_enabled')} />
      </Section>

      <Section title="Informasi donasi resmi" desc="Tampil di halaman Donasi. Isi HANYA kanal/rekening resmi yang telah disetujui pihak berwenang. Kosongkan bila belum ada.">
        <Field label="Cara berdonasi" htmlFor="donation_info" error={errors.donation_info?.message}>
          <textarea id="donation_info" rows={5} className={inputClass} {...register('donation_info', { maxLength: { value: 3000, message: 'Maksimal 3000 karakter' } })} />
        </Field>
      </Section>

      <Section title="Teks hukum" desc="Kosongkan untuk memakai teks standar bawaan website.">
        <Field label="Kebijakan privasi" htmlFor="privacy_policy" error={errors.privacy_policy?.message}>
          <textarea id="privacy_policy" rows={8} className={inputClass} {...register('privacy_policy', { maxLength: { value: 20000, message: 'Terlalu panjang' } })} />
        </Field>
        <Field label="Aturan komunitas" htmlFor="community_rules" error={errors.community_rules?.message}>
          <textarea id="community_rules" rows={8} className={inputClass} {...register('community_rules', { maxLength: { value: 20000, message: 'Terlalu panjang' } })} />
        </Field>
      </Section>

      <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!isDirty}>Simpan pengaturan</Button></div>

      <ConfirmDialog open={pending !== null} loading={saving}
        title="Aktifkan fitur sensitif?"
        description="Anda akan mengaktifkan PMB dan/atau donasi untuk publik. Pastikan persetujuan resmi kampus telah ada dan seluruh data pendukung sudah benar."
        confirmLabel="Ya, aktifkan" onCancel={() => setPending(null)} onConfirm={() => pending && void persist(pending)} />
    </form>
  )
}
