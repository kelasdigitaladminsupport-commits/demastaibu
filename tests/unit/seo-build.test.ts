import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { seoHtml } from '../../vite.config'
import sitemap from '../../netlify/functions/sitemap.mjs'
import robots from '../../netlify/functions/robots.mjs'

const html = readFileSync('index.html', 'utf8')
const transform = (env: Record<string, string>) => {
  for (const k of ['VITE_SITE_URL', 'URL', 'VITE_GOOGLE_SITE_VERIFICATION']) delete process.env[k]
  Object.assign(process.env, env)
  const plugin = seoHtml() as unknown as { transformIndexHtml: (h: string) => string }
  return plugin.transformIndexHtml(html)
}
afterEach(() => { vi.unstubAllGlobals(); for (const k of ['VITE_SITE_URL', 'URL', 'VITE_GOOGLE_SITE_VERIFICATION', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) delete process.env[k] })

describe('index.html (dibaca crawler tanpa menjalankan JavaScript)', () => {
  it('berisi judul, deskripsi, Open Graph, Twitter Card, dan data terstruktur', () => {
    for (const re of [/<title>[^<]*DEMA STAI Bahriyatul Ulum[^<]*<\/title>/, /<meta name="description" content="[^"]{50,}/, /property="og:title"/, /property="og:image"/, /name="twitter:card" content="summary_large_image"/, /application\/ld\+json/, /<html lang="id">/])
      expect(html).toMatch(re)
  })
  it('placeholder diganti dengan alamat situs saat build (Netlify menyediakan `URL`)', () => {
    const out = transform({ URL: 'https://dema.netlify.app/' })
    expect(out).toContain('<link rel="canonical" href="https://dema.netlify.app/" />')
    expect(out).toContain('content="https://dema.netlify.app/og-default.png"')
    expect(out).not.toContain('%SITE_URL%')
  })
  it('VITE_SITE_URL (domain utama) didahulukan dibanding URL Netlify', () => {
    expect(transform({ URL: 'https://a.netlify.app', VITE_SITE_URL: 'https://dema.ac.id' })).toContain('href="https://dema.ac.id/"')
  })
  it('kode verifikasi Google dipasang bila diisi, dan tag dihapus bila kosong', () => {
    expect(transform({ URL: 'https://x.app', VITE_GOOGLE_SITE_VERIFICATION: 'abc123XYZ' })).toContain('<meta name="google-site-verification" content="abc123XYZ" />')
    const empty = transform({ URL: 'https://x.app' })
    expect(empty).not.toContain('google-site-verification')
    expect(empty).not.toContain('%GOOGLE_SITE_VERIFICATION%')
  })
  it('kode verifikasi tidak dapat menyisipkan atribut/HTML liar', () => {
    const out = transform({ URL: 'https://x.app', VITE_GOOGLE_SITE_VERIFICATION: 'abc" onload="alert(1)' })
    expect(out).not.toContain('onload="alert')
  })
})

describe('sitemap.xml dinamis', () => {
  const env = () => Object.assign(process.env, { URL: 'https://dema.netlify.app', VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'pk' })
  const stubFetch = (map: Record<string, unknown>) => vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const hit = Object.entries(map).find(([k]) => url.includes(k))
    return new Response(JSON.stringify(hit ? hit[1] : []), { status: 200 })
  }))
  const get = async () => (await sitemap(new Request('https://dema.netlify.app/sitemap.xml'))).text()

  it('memuat halaman statis, berita, agenda, dan galeri yang tayang dengan alamat absolut', async () => {
    env()
    stubFetch({ 'news?': [{ slug: 'berita-satu', updated_at: '2026-05-01T10:00:00Z' }], 'events?': [{ slug: 'agenda-satu', updated_at: '2026-05-02T10:00:00Z' }], 'galleries?': [{ id: 'g-1', created_at: '2026-05-03T00:00:00Z' }] })
    const xml = await get()
    for (const loc of ['https://dema.netlify.app/', 'https://dema.netlify.app/berita', 'https://dema.netlify.app/berita/berita-satu', 'https://dema.netlify.app/agenda/agenda-satu', 'https://dema.netlify.app/galeri/g-1'])
      expect(xml).toContain(`<loc>${loc}</loc>`)
    expect(xml).toContain('<lastmod>2026-05-01</lastmod>')
    expect(xml).not.toMatch(/\/admin|\/masuk|\/pmb\/daftar/)
  })
  it('hanya mengambil yang sudah tayang (filter dikirim ke API)', async () => {
    env(); stubFetch({})
    await get()
    const urls = (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map((c) => c[0])
    expect(urls.some((u) => u.includes('news?') && u.includes('status=eq.published') && u.includes('published_at=lte.'))).toBe(true)
    expect(urls.some((u) => u.includes('events?') && u.includes('is_published=eq.true'))).toBe(true)
  })
  it('/pmb dan /donasi hanya masuk sitemap bila saklarnya aktif', async () => {
    env(); stubFetch({ 'site_settings': [{ key: 'pmb_enabled', value: true }, { key: 'donation_enabled', value: false }] })
    const xml = await get()
    expect(xml).toContain('<loc>https://dema.netlify.app/pmb</loc>')
    expect(xml).not.toContain('/donasi')
  })
  it('karakter khusus di-escape (XML valid)', async () => {
    env(); stubFetch({ 'news?': [{ slug: 'a&b<c>', updated_at: null }] })
    const xml = await get()
    expect(xml).not.toContain('a&b<c>')
    expect(xml).toMatch(/<loc>[^<]*a%26b%3Cc%3E<\/loc>/)
  })
  it('bila Supabase tidak dapat dihubungi, tetap mengembalikan halaman statis (tidak error)', async () => {
    env(); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const res = await sitemap(new Request('https://dema.netlify.app/sitemap.xml'))
    expect(res.status).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('<loc>https://dema.netlify.app/berita</loc>')
  })
  it('tanpa konfigurasi Supabase: hanya halaman statis, header XML benar', async () => {
    Object.assign(process.env, { URL: 'https://dema.netlify.app' })
    const res = await sitemap(new Request('https://dema.netlify.app/sitemap.xml'))
    expect(res.headers.get('content-type')).toMatch(/application\/xml/)
    expect(await res.text()).toContain('<urlset')
  })
})

describe('robots.txt dinamis', () => {
  it('mengizinkan situs publik, menolak area privat, dan menunjuk sitemap beralamat absolut', async () => {
    process.env.URL = 'https://dema.netlify.app'
    const res = await robots(new Request('https://dema.netlify.app/robots.txt'))
    const txt = await res.text()
    expect(res.headers.get('content-type')).toMatch(/text\/plain/)
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    for (const p of ['/admin', '/masuk', '/pmb/pendaftaran', '/pmb/bukti', '/forum/baru']) expect(txt).toContain(`Disallow: ${p}`)
    expect(txt).toContain('Sitemap: https://dema.netlify.app/sitemap.xml')
    expect(txt).not.toMatch(/Disallow: \/\s*$/m)   // tidak memblokir seluruh situs
  })
})
