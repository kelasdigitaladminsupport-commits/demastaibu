import { siFacebook, siInstagram, siTelegram, siThreads, siTiktok, siWhatsapp, siX, siYoutube } from 'simple-icons'

export interface SocialDef { key: string; label: string; placeholder: string; path: string }

// Ikon: pustaka simple-icons (lisensi CC0). Nama merek adalah milik pemiliknya masing-masing.
export const SOCIALS: SocialDef[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/akun', path: siInstagram.path },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@akun', path: siTiktok.path },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@kanal', path: siYoutube.path },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/halaman', path: siFacebook.path },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/akun', path: siX.path },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/62812xxxxxxx atau tautan saluran', path: siWhatsapp.path },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/akun', path: siTelegram.path },
  { key: 'threads', label: 'Threads', placeholder: 'https://threads.net/@akun', path: siThreads.path },
]
export const SOCIAL_BY_KEY: Record<string, SocialDef> = Object.fromEntries(SOCIALS.map((s) => [s.key, s]))

/** Hanya tautan http(s) yang boleh dirender (mencegah javascript:, data:, dsb). */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null
  const t = u.trim()
  try {
    const parsed = new URL(t)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch { return null }
}

export function SocialIcon({ path, className = 'size-5' }: { path: string; className?: string }) {
  return <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} fill="currentColor"><path d={path} /></svg>
}
