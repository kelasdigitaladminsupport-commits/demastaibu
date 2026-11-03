// Menyisipkan metadata per halaman (judul, deskripsi, gambar, kanonik, data terstruktur) ke HTML aplikasi untuk
// /berita/:slug dan /agenda/:slug, sehingga pratinjau tautan (WhatsApp/Facebook/X) dan Google melihat isi yang benar
// meskipun mereka tidak menjalankan JavaScript. Browser pengguna tetap memuat aplikasi seperti biasa.
//
// Aman terhadap kegagalan: bila data tidak ditemukan / Supabase tidak terjangkau, HTML bawaan aplikasi tetap disajikan.
// Hasil di-cache di CDN Netlify agar fungsi tidak dipanggil pada setiap kunjungan (hemat kuota kredit).
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const attr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const text = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…` }
const jsonSafe = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

async function getJson(url, headers) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000)
  try { const r = await fetch(url, { headers, signal: ctrl.signal }); return r.ok ? await r.json() : null } catch { return null } finally { clearTimeout(t) }
}

function setMeta(html, kind, key, value) {
  const re = new RegExp(`(<meta\\s+${kind}="${key}"\\s+content=")[^"]*(")`)
  return re.test(html) ? html.replace(re, (_m, a, b) => `${a}${attr(value)}${b}`) : html
}

function respond(html, { found }) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      // Cache di CDN Netlify; data yang ditemukan lebih lama disimpan daripada yang tidak ditemukan.
      'Netlify-CDN-Cache-Control': found ? 'public, s-maxage=900, stale-while-revalidate=86400' : 'public, s-maxage=60',
    },
  })
}

export default async (req) => {
  const env = process.env
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const slug = (url.searchParams.get('slug') || '').replace(/\/+$/, '')
  const site = (env.VITE_SITE_URL || env.URL || url.origin).trim().replace(/\/$/, '')

  // 1) HTML aplikasi. Bila gagal diambil, tidak ada yang dapat disajikan dengan aman.
  let html
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(`${url.origin}/index.html`, { signal: ctrl.signal }); clearTimeout(t)
    if (!r.ok) throw new Error('index')
    html = await r.text()
  } catch { return new Response('Layanan sementara tidak tersedia. Silakan muat ulang beberapa saat lagi.', { status: 502 }) }

  if (!['berita', 'agenda'].includes(type) || !SLUG.test(slug)) return respond(html, { found: false })

  // 2) Data publik (kunci publishable + RLS: hanya yang sudah tayang yang dapat dibaca).
  const base = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '').trim()
  if (!base || !key) return respond(html, { found: false })
  const h = { apikey: key, Authorization: `Bearer ${key}` }
  const s = encodeURIComponent(slug)
  let row = null
  if (type === 'berita') {
    const now = encodeURIComponent(new Date().toISOString())
    const d = await getJson(`${base}/rest/v1/news?select=title,excerpt,content,cover_path,published_at,updated_at,author_name&slug=eq.${s}&status=eq.published&published_at=lte.${now}&limit=1`, h)
    row = d?.[0] ?? null
  } else {
    const d = await getJson(`${base}/rest/v1/events?select=title,description,poster_path,event_date,location&slug=eq.${s}&is_published=eq.true&limit=1`, h)
    row = d?.[0] ?? null
  }
  if (!row) return respond(html, { found: false })

  // 3) Susun metadata
  const siteShort = 'DEMA STAI Bahriyatul Ulum'
  const title = `${row.title} — ${siteShort}`
  const description = clip(type === 'berita' ? (row.excerpt || row.content) : (row.description || `${row.title}${row.location ? ` di ${row.location}` : ''}`))
  const img0 = type === 'berita' ? row.cover_path : row.poster_path
  const image = img0 ? (/^https?:\/\//i.test(img0) ? img0 : `${base}/storage/v1/object/public/public-media/${img0.split('/').map(encodeURIComponent).join('/')}`) : `${site}/og-default.png`
  const canonical = `${site}/${type}/${slug}`

  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${text(title)}</title>`)
  out = setMeta(out, 'name', 'description', description)
  out = setMeta(out, 'property', 'og:type', type === 'berita' ? 'article' : 'website')
  out = setMeta(out, 'property', 'og:title', title)
  out = setMeta(out, 'property', 'og:description', description)
  out = setMeta(out, 'property', 'og:url', canonical)
  out = setMeta(out, 'property', 'og:image', image)
  out = setMeta(out, 'name', 'twitter:title', title)
  out = setMeta(out, 'name', 'twitter:description', description)
  out = setMeta(out, 'name', 'twitter:image', image)
  out = out.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, (_m, a, b) => `${a}${attr(canonical)}${b}`)

  const ld = type === 'berita'
    ? { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: clip(row.title, 110), description, image: [image], mainEntityOfPage: canonical,
        datePublished: row.published_at, dateModified: row.updated_at || row.published_at, inLanguage: 'id-ID',
        ...(row.author_name ? { author: { '@type': 'Person', name: row.author_name } } : {}),
        publisher: { '@type': 'Organization', name: 'DEMA STAI Bahriyatul Ulum KH. Zainul Arifin Pandan', url: `${site}/` } }
    : { '@context': 'https://schema.org', '@type': 'Event', name: row.title, description, image: [image], startDate: row.event_date, url: canonical,
        ...(row.location ? { location: { '@type': 'Place', name: row.location } } : {}) }
  out = out.replace('</head>', `    <script id="ld-page" type="application/ld+json">${jsonSafe(ld)}</script>\n  </head>`)

  return respond(out, { found: true })
}
