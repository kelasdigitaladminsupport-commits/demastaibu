/** Utilitas kecil untuk memperbarui elemen <head> dari dalam aplikasi. */
export function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

export function setLink(rel: string, href: string, type?: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el) }
  el.setAttribute('href', href)
  if (type) el.setAttribute('type', type)
}

export function truncate(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}

/** Alamat dasar situs: VITE_SITE_URL bila diisi (domain utama), selain itu alamat yang sedang dibuka. */
export function siteBase(): string {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/$/, '')
  return env || window.location.origin
}

/** Halaman privat/transaksional yang tidak boleh diindeks mesin pencari. */
export const NOINDEX_PATH = /^\/(admin|masuk|daftar|lupa-password|reset-password)(\/|$)|^\/pmb\/(daftar|status|pendaftaran|bukti)(\/|$)|^\/forum\/baru$/
