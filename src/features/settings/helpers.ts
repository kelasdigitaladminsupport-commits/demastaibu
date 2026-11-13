import type { SiteSettings } from './useSiteSettings'

export function settingText(s: SiteSettings | undefined, key: string): string {
  const v = s?.[key]
  return typeof v === 'string' ? v.trim() : ''
}

/** 'mission' boleh berupa daftar teks atau satu teks (dipecah per baris). */
export function settingList(s: SiteSettings | undefined, key: string): string[] {
  const v = s?.[key]
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
  if (typeof v === 'string') return v.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  return []
}

export function settingObject(s: SiteSettings | undefined, key: string): Record<string, string> {
  const v = s?.[key]
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string' && x.trim() !== '') as Array<[string, string]>,
  )
}
