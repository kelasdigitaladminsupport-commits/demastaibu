import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_SHORT } from '../utils/constants'
import { useBranding } from '../features/branding/useBranding'

/** Logo + nama. Logo diambil dari Pengaturan Website; bila belum diunggah, tampil huruf "D" sementara. */
export function BrandMark({ light = false }: { light?: boolean }) {
  const { logoUrl } = useBranding()
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [logoUrl])

  return (
    <Link to="/" className="flex items-center gap-3">
      {logoUrl && !failed ? (
        <span className={light ? 'rounded-lg bg-white p-1' : ''}>
          <img src={logoUrl} alt="" onError={() => setFailed(true)} className="h-10 w-auto max-w-14 object-contain" />
        </span>
      ) : (
        <span className="grid size-10 place-items-center rounded-full border-2 border-gold bg-emerald-700 font-display text-lg font-bold text-white">D</span>
      )}
      <span className={`font-display text-base font-semibold leading-tight ${light ? 'text-white' : 'text-emerald-900'}`}>{SITE_SHORT}</span>
    </Link>
  )
}
