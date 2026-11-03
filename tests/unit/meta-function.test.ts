import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import meta from '../../netlify/functions/meta.mjs'

const INDEX = readFileSync('index.html', 'utf8').replaceAll('%SITE_URL%', 'https://dema.netlify.app').replace(/\s*<meta name="google-site-verification"[^>]*>\n?/, '\n')
const ENV = { URL: 'https://dema.netlify.app', VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'pk' }

type Handler = (url: string) => Response | Promise<Response>
function stub(handler: Partial<{ index: Handler; news: Handler; events: Handler }> = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/index.html')) return handler.index ? handler.index(url) : new Response(INDEX)
    if (url.includes('/rest/v1/news')) return handler.news ? handler.news(url) : new Response('[]')
    if (url.includes('/rest/v1/events')) return handler.events ? handler.events(url) : new Response('[]')
    return new Response('', { status: 404 })
  }))
}
const call = (type: string, slug: string) => meta(new Request(`https://dema.netlify.app/.netlify/functions/meta?type=${type}&slug=${encodeURIComponent(slug)}`))
const article = (over: Record<string, unknown> = {}) => [{ title: 'Pelantikan Pengurus Baru', excerpt: 'Ringkasan berita pelantikan.', content: 'Isi panjang', cover_path: 'news/abc.jpg', published_at: '2026-05-01T08:00:00Z', updated_at: '2026-05-02T08:00:00Z', author_name: 'Admin', ...over }]

beforeEach(() => { Object.assign(process.env, ENV) })
afterEach(() => { vi.unstubAllGlobals(); for (const k of Object.keys(ENV)) delete process.env[k] })

describe('metadata per berita/agenda', () => {
  it('berita: judul, deskripsi, gambar, kanonik, dan NewsArticle disisipkan ke HTML statis', async () => {
    stub({ news: () => new Response(JSON.stringify(article())) })
    const res = await call('berita', 'pelantikan-pengurus-baru')
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('<title>Pelantikan Pengurus Baru — DEMA STAI Bahriyatul Ulum</title>')
    expect(html).toContain('<meta property="og:title" content="Pelantikan Pengurus Baru — DEMA STAI Bahriyatul Ulum" />')
    expect(html).toContain('<meta property="og:description" content="Ringkasan berita pelantikan." />')
    expect(html).toContain('<meta property="og:image" content="https://p.supabase.co/storage/v1/object/public/public-media/news/abc.jpg" />')
    expect(html).toContain('<meta property="og:type" content="article" />')
    expect(html).toContain('<link rel="canonical" href="https://dema.netlify.app/berita/pelantikan-pengurus-baru" />')
    const ld = JSON.parse(/<script id="ld-page"[^>]*>([\s\S]*?)<\/script>/.exec(html)![1])
    expect(ld['@type']).toBe('NewsArticle')
    expect(ld.headline).toBe('Pelantikan Pengurus Baru')
    expect(ld.datePublished).toBe('2026-05-01T08:00:00Z')
    expect(html).toContain('id="root"')                      // aplikasi tetap dimuat
    expect(html).toContain('src="/src/main.tsx"')
  })
  it('hanya meminta berita yang sudah tayang', async () => {
    stub({ news: () => new Response(JSON.stringify(article())) })
    await call('berita', 'x-y')
    const u = (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map((c) => c[0]).find((x) => x.includes('/rest/v1/news'))!
    expect(u).toContain('slug=eq.x-y'); expect(u).toContain('status=eq.published'); expect(u).toContain('published_at=lte.')
  })
  it('tanpa gambar sampul memakai gambar bawaan situs', async () => {
    stub({ news: () => new Response(JSON.stringify(article({ cover_path: null }))) })
    expect(await (await call('berita', 'abc')).text()).toContain('content="https://dema.netlify.app/og-default.png" />')
  })
  it('tanpa ringkasan memakai potongan isi (maks. 160 karakter)', async () => {
    stub({ news: () => new Response(JSON.stringify(article({ excerpt: null, content: 'kata '.repeat(100) }))) })
    const html = await (await call('berita', 'abc')).text()
    const d = /property="og:description" content="([^"]*)"/.exec(html)![1]
    expect(d.length).toBeLessThanOrEqual(160); expect(d.endsWith('…')).toBe(true)
  })
  it('agenda: tipe Event dan lokasi', async () => {
    stub({ events: () => new Response(JSON.stringify([{ title: 'Seminar Nasional', description: 'Deskripsi seminar', poster_path: null, event_date: '2026-06-01T02:00:00Z', location: 'Aula' }])) })
    const html = await (await call('agenda', 'seminar-nasional')).text()
    expect(html).toContain('<title>Seminar Nasional — DEMA STAI Bahriyatul Ulum</title>')
    expect(html).toContain('<link rel="canonical" href="https://dema.netlify.app/agenda/seminar-nasional" />')
    const ld = JSON.parse(/<script id="ld-page"[^>]*>([\s\S]*?)<\/script>/.exec(html)![1])
    expect(ld['@type']).toBe('Event'); expect(ld.location.name).toBe('Aula')
  })
})

describe('keamanan: judul berbahaya tidak dapat menyuntikkan HTML/skrip', () => {
  it('tanda kutip, tag, dan penutup script di judul dinetralkan', async () => {
    const evil = 'Judul "><script>alert(1)</script></title><img src=x onerror=alert(2)>'
    stub({ news: () => new Response(JSON.stringify(article({ title: evil, excerpt: evil, author_name: '</script><script>alert(3)' }))) })
    const html = await (await call('berita', 'abc')).text()
    expect(html).not.toContain('<script>alert')
    expect(html).not.toMatch(/<img src=x onerror/)
    expect(html).not.toContain('"><script')
    const scripts = html.match(/<script\b/g) ?? []
    expect(scripts.length).toBe((INDEX.match(/<script\b/g) ?? []).length + 1)   // hanya +1: ld-page milik kita
    const ld = JSON.parse(/<script id="ld-page"[^>]*>([\s\S]*?)<\/script>/.exec(html)![1])
    expect(ld.headline).toContain('<script>')            // data tetap utuh sebagai teks JSON, tidak mengeksekusi apa pun
  })
  it.each(['../etc/passwd', 'a b', 'A-B', "x'or'1", 'a/b', '', '%00', 'a;b'])('slug tidak sah %j -> HTML bawaan, tanpa kueri database', async (slug) => {
    stub()
    const res = await call('berita', slug)
    expect(await res.text()).toContain('Website Resmi')
    const calls = (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map((c) => c[0])
    expect(calls.some((c) => c.includes('/rest/v1/'))).toBe(false)
  })
  it('tipe tidak dikenal -> HTML bawaan', async () => {
    stub(); expect(await (await call('admin', 'abc')).text()).toContain('id="root"')
  })
})

describe('tahan gangguan', () => {
  it('data tidak ditemukan: HTML bawaan aplikasi (halaman 404 ditangani aplikasi), cache pendek', async () => {
    stub({ news: () => new Response('[]') })
    const res = await call('berita', 'tidak-ada')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<title>DEMA STAI Bahriyatul Ulum KH. Zainul Arifin Pandan — Website Resmi</title>')
    expect(res.headers.get('netlify-cdn-cache-control')).toBe('public, s-maxage=60')
  })
  it('Supabase error/offline: tetap menyajikan HTML bawaan (tidak 500)', async () => {
    stub({ news: () => { throw new Error('offline') } })
    const res = await call('berita', 'abc')
    expect(res.status).toBe(200); expect(await res.text()).toContain('id="root"')
  })
  it('konfigurasi Supabase kosong: HTML bawaan', async () => {
    delete process.env.VITE_SUPABASE_URL; stub()
    expect((await call('berita', 'abc')).status).toBe(200)
  })
  it('HTML aplikasi tidak bisa diambil: 502 dengan pesan jelas', async () => {
    stub({ index: () => new Response('x', { status: 500 }) })
    const res = await call('berita', 'abc')
    expect(res.status).toBe(502); expect(await res.text()).toMatch(/sementara tidak tersedia/)
  })
  it('hasil ditemukan di-cache CDN lebih lama agar fungsi jarang dipanggil', async () => {
    stub({ news: () => new Response(JSON.stringify(article())) })
    expect((await call('berita', 'abc')).headers.get('netlify-cdn-cache-control')).toMatch(/s-maxage=900/)
  })
})
