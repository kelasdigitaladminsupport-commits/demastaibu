// Sitemap dinamis: dibuat saat diminta (tanpa perlu deploy ulang tiap ada berita baru).
// Mengambil slug berita/agenda yang SUDAH TAYANG lewat API publik Supabase (kunci publishable + RLS).
const STATIC_PATHS = ['/', '/profil', '/visi-misi', '/struktur', '/bidang', '/berita', '/agenda', '/program-kerja', '/galeri',
  '/pengabdian', '/laporan', '/kontak', '/aspirasi', '/forum', '/kolaborasi', '/kebijakan-privasi', '/aturan-komunitas']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

async function rest(base, key, path) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: ctrl.signal })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] } finally { clearTimeout(timer) }
}

export default async (req) => {
  const env = process.env
  const site = (env.VITE_SITE_URL || env.URL || new URL(req.url).origin).trim().replace(/\/$/, '')
  const base = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '').trim()

  const urls = STATIC_PATHS.map((p) => ({ loc: `${site}${p}` }))

  if (base && key) {
    const now = new Date().toISOString()
    const [settings, news, events, galleries] = await Promise.all([
      rest(base, key, 'site_settings?select=key,value&key=in.(pmb_enabled,donation_enabled)'),
      rest(base, key, `news?select=slug,updated_at&status=eq.published&published_at=lte.${encodeURIComponent(now)}&order=published_at.desc&limit=1000`),
      rest(base, key, 'events?select=slug,updated_at&is_published=eq.true&order=event_date.desc&limit=1000'),
      rest(base, key, 'galleries?select=id,created_at&is_published=eq.true&order=created_at.desc&limit=500'),
    ])
    const on = (k) => settings.some((s) => s.key === k && s.value === true)
    if (on('pmb_enabled')) urls.push({ loc: `${site}/pmb` })
    if (on('donation_enabled')) urls.push({ loc: `${site}/donasi` })
    for (const n of news) if (n.slug) urls.push({ loc: `${site}/berita/${encodeURIComponent(n.slug)}`, lastmod: n.updated_at })
    for (const e of events) if (e.slug) urls.push({ loc: `${site}/agenda/${encodeURIComponent(e.slug)}`, lastmod: e.updated_at })
    for (const g of galleries) if (g.id) urls.push({ loc: `${site}/galeri/${encodeURIComponent(g.id)}`, lastmod: g.created_at })
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(String(u.lastmod).slice(0, 10))}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n'

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
