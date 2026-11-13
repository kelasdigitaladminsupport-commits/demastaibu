import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useBranding } from '../branding/useBranding'
import { SOCIALS, safeUrl } from '../branding/socials'
import { useSiteSettings } from '../settings/useSiteSettings'
import { settingObject } from '../settings/helpers'
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_SHORT } from '../../utils/constants'
import { NOINDEX_PATH, setLink, setMeta, siteBase } from './head'

/**
 * Menjaga elemen <head> tetap benar pada setiap perpindahan halaman:
 * alamat kanonik, og:url, aturan robots, ikon tab dari logo, dan data terstruktur (schema.org) organisasi.
 * Dipasang sekali di RootLayout.
 */
export function SeoManager() {
  const { pathname } = useLocation()
  const { logoUrl } = useBranding()
  const settings = useSiteSettings()

  // Kanonik, og:url, robots
  useEffect(() => {
    const base = siteBase()
    const url = `${base}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`
    setLink('canonical', url)
    setMeta('property', 'og:url', url)
    setMeta('name', 'robots', NOINDEX_PATH.test(pathname) ? 'noindex,nofollow' : 'index,follow')
  }, [pathname])

  // Ikon tab peramban mengikuti logo (sinkron dengan Pengaturan Website)
  useEffect(() => {
    if (logoUrl) { setLink('icon', logoUrl); setLink('apple-touch-icon', logoUrl) }
    else setLink('icon', '/favicon.svg', 'image/svg+xml')
  }, [logoUrl])

  // Data terstruktur organisasi (membantu Google mengenali nama, logo, dan akun resmi). Hanya di beranda.
  useEffect(() => {
    if (pathname !== '/') return
    const links = settingObject(settings.data, 'social_links')
    const sameAs = SOCIALS.map((s) => safeUrl(links[s.key])).filter((u): u is string => Boolean(u))
    const base = siteBase()
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization', '@id': `${base}/#organization`, name: SITE_NAME, alternateName: SITE_SHORT, url: `${base}/`,
          ...(logoUrl ? { logo: logoUrl } : {}), ...(sameAs.length ? { sameAs } : {}),
        },
        { '@type': 'WebSite', '@id': `${base}/#website`, url: `${base}/`, name: SITE_NAME, alternateName: SITE_SHORT, inLanguage: 'id-ID', description: DEFAULT_DESCRIPTION, publisher: { '@id': `${base}/#organization` } },
      ],
    }
    let el = document.getElementById('ld-json') as HTMLScriptElement | null
    if (!el) { el = document.createElement('script'); el.id = 'ld-json'; el.type = 'application/ld+json'; document.head.appendChild(el) }
    el.textContent = JSON.stringify(graph)
  }, [pathname, logoUrl, settings.data])

  return null
}
