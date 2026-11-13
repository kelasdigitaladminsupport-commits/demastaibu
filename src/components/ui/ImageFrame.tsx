import { useState, type ReactNode } from 'react'
import { ImageIcon } from 'lucide-react'
import { publicUrl, type PublicBucket } from '../../utils/storage'
import { cn } from '../../utils/cn'

interface ImageFrameProps {
  path: string | null | undefined
  alt: string
  bucket?: PublicBucket
  /** teks di bawah gambar (opsional) */
  caption?: ReactNode
  /** bila diisi, frame menjadi tombol (mis. membuka pratinjau besar) */
  onClick?: () => void
  className?: string
}

/**
 * Frame gambar yang UKURAN BLOKNYA MENGIKUTI GAMBAR: lebar mengisi kolom, tinggi mengikuti proporsi asli
 * (potret tinggi, lanskap lebar, persegi tetap persegi). Gambar tidak pernah dipotong atau ditarik.
 * Sebelum gambar termuat, kotak penampung berproporsi 4:3 lalu otomatis menyesuaikan setelah ukuran asli diketahui.
 */
export function ImageFrame({ path, alt, bucket = 'public-media', caption, onClick, className }: ImageFrameProps) {
  const [ratio, setRatio] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const src = publicUrl(path, bucket)
  const broken = !src || failed

  const media = broken ? (
    <div className="grid aspect-4/3 w-full place-items-center rounded-xl bg-linear-to-br from-emerald-100 to-emerald-50 text-emerald-600" role="img" aria-label={alt}>
      <ImageIcon className="size-8 opacity-60" aria-hidden />
    </div>
  ) : (
    <img
      ref={(el) => { if (el && ratio === null && el.complete && el.naturalWidth) setRatio(el.naturalWidth / el.naturalHeight) }}
      src={src} alt={alt} loading="lazy" decoding="async"
      onLoad={(e) => { const i = e.currentTarget; setRatio(i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : 4 / 3) }}
      onError={() => setFailed(true)}
      style={{ aspectRatio: ratio ?? 4 / 3 }}
      className={cn('block h-auto w-full rounded-xl bg-slate-100 object-contain transition-opacity', ratio === null && 'opacity-0')}
    />
  )

  const frame = 'overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm'
  return (
    <figure className={cn(frame, onClick && 'transition hover:shadow-md', className)}>
      {onClick ? (
        <button type="button" onClick={onClick} className="block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={`Buka foto: ${alt}`}>{media}</button>
      ) : media}
      {caption && <figcaption className="px-2 pb-1.5 pt-2 text-xs text-slate-600">{caption}</figcaption>}
    </figure>
  )
}
