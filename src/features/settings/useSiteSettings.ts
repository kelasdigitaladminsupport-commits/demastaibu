import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export type SiteSettings = Record<string, unknown>

/** Pengaturan publik (is_public = true). Pengunjung anonim hanya menerima baris publik berkat RLS. */
export function useSiteSettings() {
  return useQuery({
    queryKey: ['site_settings', 'public'],
    staleTime: 60_000,
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase.from('site_settings').select('key, value')
      if (error) throw error
      return Object.fromEntries(
        ((data ?? []) as Array<{ key: string; value: unknown }>).map((r) => [r.key, r.value]),
      )
    },
  })
}

export function useFeatureEnabled(key: 'pmb_enabled' | 'donation_enabled' | 'forum_enabled' | 'aspiration_enabled') {
  const { data } = useSiteSettings()
  return data?.[key] === true
}
