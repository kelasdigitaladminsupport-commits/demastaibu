import { createClient } from '@supabase/supabase-js'
import { trackedFetch } from './netActivity'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** Pengaman: kunci service_role tidak boleh pernah berada di frontend. */
function looksLikeServiceKey(k: string | undefined): boolean {
  if (!k) return false
  if (k.startsWith('sb_secret_')) return true
  try {
    const payload = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

export const hasServiceKeyLeak = looksLikeServiceKey(key)
export const isSupabaseConfigured = Boolean(url && key) && !hasServiceKeyLeak

// Klien sengaja TIDAK memakai tipe hasil generate (supabase gen types): kueri dinamis pada mesin CRUD admin
// tidak kompatibel dengan tipe ketat. Hasil kueri diberi tipe lewat src/types/content.ts dan antarmuka lokal.
export const supabase = createClient(
  isSupabaseConfigured ? (url as string) : 'http://localhost:54321',
  isSupabaseConfigured ? (key as string) : 'not-configured',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { fetch: trackedFetch },   // memunculkan animasi loading global untuk setiap aksi
  },
)
