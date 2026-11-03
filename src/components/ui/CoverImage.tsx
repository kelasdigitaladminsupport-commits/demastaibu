import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { publicUrl, type PublicBucket } from '../../utils/storage'
import { cn } from '../../utils/cn'

interface CoverImageProps { path: string | null | undefined; alt: string; bucket?: PublicBucket; className?: string }

export function CoverImage({ path, alt, bucket = 'public-media', className }: CoverImageProps) {
  const [failed, setFailed] = useState(false)
  const src = publicUrl(path, bucket)
  if (!src || failed) {
    return (
      <div className={cn('grid place-items-center bg-linear-to-br from-emerald-100 to-emerald-50 text-emerald-600', className)} role="img" aria-label={alt}>
        <ImageIcon className="size-8 opacity-60" aria-hidden />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />
}
