import { supabase } from '../lib/supabase'

export type PublicBucket = 'public-media' | 'public-docs' | 'avatars'

/** URL publik untuk berkas di bucket publik. Mengembalikan null jika path kosong. */
export function publicUrl(path: string | null | undefined, bucket: PublicBucket = 'public-media'): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
