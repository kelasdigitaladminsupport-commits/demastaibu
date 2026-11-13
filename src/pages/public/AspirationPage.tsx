import { useSearchParams } from 'react-router-dom'
import { MessageSquareOff } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { EmptyState } from '../../components/ui/EmptyState'
import { SubmitForm } from '../../features/aspirations/SubmitForm'
import { TrackPanel } from '../../features/aspirations/TrackPanel'
import { PublicWall } from '../../features/aspirations/PublicWall'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../utils/cn'

const TABS = [
  { value: 'kirim', label: 'Kirim aspirasi' },
  { value: 'lacak', label: 'Lacak tiket' },
  { value: 'publik', label: 'Aspirasi publik' },
] as const

export function AspirationPage() {
  useDocumentTitle('Aspirasi, Kritik, dan Saran')
  const [sp, setSp] = useSearchParams()
  const settings = useSiteSettings()
  const tab = TABS.find((t) => t.value === sp.get('tab'))?.value ?? 'kirim'
  const code = sp.get('kode') ?? ''
  const closed = settings.data?.aspiration_enabled === false

  const go = (t: string, kode?: string) => { const n = new URLSearchParams(); n.set('tab', t); if (kode) n.set('kode', kode); setSp(n) }

  return (
    <>
      <PageHeader title="Aspirasi, Kritik, dan Saran" description="Sampaikan suara Anda kepada DEMA. Setiap aspirasi mendapat kode tiket untuk memantau tindak lanjutnya." />
      <Container className="max-w-3xl">
        <div role="tablist" aria-label="Menu aspirasi" className="mb-8 inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => go(t.value)}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === t.value ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{t.label}</button>
          ))}
        </div>

        {tab === 'kirim' && (closed
          ? <EmptyState icon={MessageSquareOff} title="Formulir aspirasi sedang ditutup" description="Silakan coba lagi nanti atau hubungi pengurus melalui halaman Kontak." />
          : <SubmitForm onTrack={(c) => go('lacak', c)} />)}
        {tab === 'lacak' && <TrackPanel initialCode={code} />}
        {tab === 'publik' && <PublicWall />}
      </Container>
    </>
  )
}
