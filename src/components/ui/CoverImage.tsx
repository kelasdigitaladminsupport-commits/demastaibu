import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { publicUrl, type PublicBucket } from '../../utils/storage'
import { cn } from '../../utils/cn'

/**
 * Cara gambar ditampilkan — TIDAK PERNAH memotong gambar:
 *  - 'blur'    (bawaan) : seluruh gambar terlihat di dalam kotak berukuran tetap; ruang sisa diisi versi buram dari gambar itu
 *                         sendiri. Cocok untuk kartu/daftar agar rapi dan seragam tanpa memotong foto.
 *  - 'natural'            : mengikuti proporsi asli gambar (tinggi menyesuaikan). Untuk halaman detail dan pratinjau unggahan.
 *  - 'logo'               : muat utuh di dalam kotak, tanpa latar. Untuk logo (sponsor, pratinjau logo).
 */
export type ImageFit = 'blur' | 'natural' | 'logo'

interface CoverImageProps { path: string | null | undefined; alt: string; bucket?: PublicBucket; className?: string; fit?: ImageFit }

export function CoverImage({ path, alt, bucket = 'public-media', className, fit = 'blur' }: CoverImageProps) {
  const [failed, setFailed] = useState(false)
  const src = publicUrl(path, bucket)

  if (!src || failed) {
    return (
      <div className={cn('grid min-h-24 place-items-center bg-linear-to-br from-emerald-100 to-emerald-50 text-emerald-600', className)} role="img" aria-label={alt}>
        <ImageIcon className="size-8 opacity-60" aria-hidden />
      </div>
    )
  }

  if (fit === 'natural') {
    return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('block h-auto max-w-full bg-slate-100 object-contain', className)} />
  }

  if (fit === 'logo') {
    return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-contain', className)} />
  }

  return (
    <div className={cn('relative overflow-hidden bg-slate-100', className)}>
      {/* Latar: gambar yang sama, diperbesar dan dikaburkan hanya untuk mengisi ruang sisa (bukan bagian yang dipotong) */}
      <img src={src} alt="" aria-hidden loading="lazy" className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-xl" />
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="relative size-full object-contain" />
    </div>
  )
}
