import { useState } from 'react'
import { Info } from 'lucide-react'
import { ResourceManager } from '../../features/admin/ResourceManager'
import { RESOURCES } from '../../features/admin/resources'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../utils/cn'

export function DonationsAdminPage() {
  useDocumentTitle('Donasi — Admin')
  const [tab, setTab] = useState<'catatan' | 'laporan'>('catatan')
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Donasi</h1>
      <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>Pencatatan donasi dilakukan <strong>manual</strong> setelah dana benar-benar diterima dan diverifikasi. Tidak ada pembayaran otomatis. Halaman publik hanya menampilkan donasi berstatus <em>Terverifikasi</em> dan <em>Tampil</em>, serta hanya bila fitur donasi diaktifkan di Pengaturan Website.</p>
      </div>
      <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
        {([['catatan', 'Catatan donasi'], ['laporan', 'Laporan pertanggungjawaban']] as const).map(([v, l]) => (
          <button key={v} role="tab" type="button" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-medium', tab === v ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600')}>{l}</button>
        ))}
      </div>
      {tab === 'catatan' ? <ResourceManager key="dc" config={RESOURCES['donasi-catatan']} /> : <ResourceManager key="dl" config={RESOURCES['donasi-laporan']} />}
    </div>
  )
}
