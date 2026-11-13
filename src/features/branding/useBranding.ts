import { useEffect } from 'react'
import { useSiteSettings } from '../settings/useSiteSettings'
import { publicUrl } from '../../utils/storage'

const CACHE_KEY = 'dema:logo'   // preferensi tampilan (bukan data sensitif): mencegah kedipan logo saat memuat

function readCache(): string | null { try { return localStorage.getItem(CACHE_KEY) } catch { return null } }
function writeCache(v: string | null) { try { if (v) localStorage.setItem(CACHE_KEY, v); else localStorage.removeItem(CACHE_KEY) } catch { /* abaikan */ } }

/** Sumber tunggal logo: nilai `site_logo` pada site_settings. Semua tampilan logo memakai hook ini, sehingga selalu sinkron. */
export function useBranding() {
  const { data } = useSiteSettings()
  const fromSettings = typeof data?.site_logo === 'string' ? data.site_logo.trim() : ''
  const path = data ? (fromSettings || null) : readCache()

  useEffect(() => { if (data) writeCache(fromSettings || null) }, [data, fromSettings])

  return { logoPath: path, logoUrl: publicUrl(path, 'public-media') }
}
