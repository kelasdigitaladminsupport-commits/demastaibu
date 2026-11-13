import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { SubmitForm } from '../../features/partnerships/SubmitForm'
import { TrackPanel } from '../../features/partnerships/TrackPanel'
import { SponsorsGrid } from '../../features/partnerships/SponsorsGrid'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../utils/cn'

const TABS = [
  { value: 'ajukan', label: 'Ajukan kerja sama' },
  { value: 'lacak', label: 'Lacak permohonan' },
  { value: 'mitra', label: 'Mitra kami' },
] as const

export function PartnershipPage() {
  useDocumentTitle('Kolaborasi dan Sponsorship')
  const [sp, setSp] = useSearchParams()
  const tab = TABS.find((t) => t.value === sp.get('tab'))?.value ?? 'ajukan'
  // Email pemohon tidak dimasukkan ke URL; cukup disimpan di state selama halaman terbuka.
  const [prefill, setPrefill] = useState<{ ref: string; email: string }>({ ref: '', email: '' })
  const go = (t: string, ref?: string, email?: string) => {
    setPrefill({ ref: ref ?? '', email: email ?? '' })
    setSp({ tab: t })
  }
  return (
    <>
      <PageHeader title="Kolaborasi dan Sponsorship" description="Sponsor, donatur, lembaga, UMKM, instansi, komunitas, alumni, dan masyarakat dapat bermitra dengan DEMA." />
      <Container className="max-w-4xl">
        <div role="tablist" aria-label="Menu kolaborasi" className="mb-8 inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => go(t.value)}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === t.value ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{t.label}</button>
          ))}
        </div>
        {tab === 'ajukan' && <SubmitForm onTrack={(r, e) => go('lacak', r, e)} />}
        {tab === 'lacak' && <TrackPanel initialRef={prefill.ref} initialEmail={prefill.email} />}
        {tab === 'mitra' && <SponsorsGrid />}
      </Container>
    </>
  )
}
