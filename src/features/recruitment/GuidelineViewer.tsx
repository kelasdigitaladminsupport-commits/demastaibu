import { Download, ExternalLink, FileText } from 'lucide-react'
import { publicUrl } from '../../utils/storage'
import { buttonStyles } from '../../components/ui/Button'

/**
 * Menampilkan PDF Pedoman Kemahasiswaan. Layar lebar: pratinjau langsung di halaman.
 * Ponsel: peramban seluler umumnya tidak menampilkan PDF di dalam halaman, jadi hanya tombol Buka/Unduh.
 */
export function GuidelineViewer({ path, title }: { path: string; title?: string | null }) {
  const url = publicUrl(path, 'public-docs')
  if (!url) return null
  const label = title?.trim() || 'Pedoman Kemahasiswaan'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><FileText className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">Dokumen resmi (PDF). Persyaratan di atas bersumber dari dokumen ini.</p>
        </div>
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className={buttonStyles('outline', 'sm')}><ExternalLink className="size-4" aria-hidden /> Buka</a>
          <a href={url} download className={buttonStyles('ghost', 'sm')}><Download className="size-4" aria-hidden /> Unduh</a>
        </div>
      </div>
      <iframe src={`${url}#view=FitH`} title={label} loading="lazy" className="mt-4 hidden h-[70vh] w-full rounded-lg border border-slate-200 md:block" />
    </div>
  )
}
