import { Link2, Share2 } from 'lucide-react'
import { toast } from 'sonner'

export function ShareButtons({ title }: { title: string }) {
  const url = window.location.href
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
  const cls = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'

  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success('Tautan disalin.') }
    catch { toast.error('Tidak dapat menyalin tautan.') }
  }
  async function nativeShare() {
    try { await navigator.share({ title, url }) } catch { /* dibatalkan pengguna */ }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500">Bagikan:</span>
      <button type="button" onClick={copy} className={cls}><Link2 className="size-4" /> Salin tautan</button>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={cls}>WhatsApp</a>
      {typeof navigator.share === 'function' && (
        <button type="button" onClick={nativeShare} className={cls}><Share2 className="size-4" /> Lainnya</button>
      )}
    </div>
  )
}
