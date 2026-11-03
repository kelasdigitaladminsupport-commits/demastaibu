import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Mengisi placeholder SEO di index.html saat build:
 *  %SITE_URL%                  -> VITE_SITE_URL (domain utama) atau `URL` bawaan Netlify
 *  %GOOGLE_SITE_VERIFICATION%  -> VITE_GOOGLE_SITE_VERIFICATION (bila kosong, tag dihapus)
 */
export function seoHtml(): Plugin {
  return {
    name: 'seo-html',
    transformIndexHtml(html) {
      const site = (process.env.VITE_SITE_URL || process.env.URL || '').trim().replace(/\/$/, '')
      const gsv = (process.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim()
      let out = html.replaceAll('%SITE_URL%', site)
      out = gsv
        ? out.replaceAll('%GOOGLE_SITE_VERIFICATION%', gsv.replace(/"/g, ''))
        : out.replace(/\s*<meta name="google-site-verification"[^>]*>\n?/, '\n')
      return out
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seoHtml()],
})
