// robots.txt dinamis agar baris Sitemap memakai alamat situs yang sebenarnya.
export default async (req) => {
  const env = process.env
  const site = (env.VITE_SITE_URL || env.URL || new URL(req.url).origin).trim().replace(/\/$/, '')
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /masuk',
    'Disallow: /daftar',
    'Disallow: /lupa-password',
    'Disallow: /reset-password',
    'Disallow: /pmb/daftar',
    'Disallow: /pmb/status',
    'Disallow: /pmb/pendaftaran',
    'Disallow: /pmb/bukti',
    'Disallow: /forum/baru',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
