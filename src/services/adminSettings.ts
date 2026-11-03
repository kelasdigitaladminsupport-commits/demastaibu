import { supabase } from '../lib/supabase'

export type SettingsMap = Record<string, unknown>
export interface SettingEntry { key: string; value: unknown; is_public: boolean }

/** Semua baris site_settings (termasuk yang tidak publik; hanya admin yang dapat membacanya). */
export async function fetchAllSettings(): Promise<SettingsMap> {
  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (error) throw error
  return Object.fromEntries(((data ?? []) as Array<{ key: string; value: unknown }>).map((r) => [r.key, r.value]))
}

export async function saveSettings(entries: SettingEntry[]) {
  const { error } = await supabase.from('site_settings').upsert(entries, { onConflict: 'key' })
  if (error) throw error
}

export const str = (v: unknown): string => (typeof v === 'string' ? v : '')
export const obj = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {}
