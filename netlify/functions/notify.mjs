// Menerima panggilan dari database Supabase (trigger notify_staff, lihat migrasi 0014) lalu mengirim email
// pemberitahuan ke staf lewat Resend. Dilindungi rahasia bersama (header x-notify-secret).
// Variabel Netlify: NOTIFY_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL (mis. "DEMA <notifikasi@domain-anda.id>").
// Email sengaja TIDAK memuat data pribadi: hanya jenis, nomor referensi, dan tautan ke dasbor.
import { timingSafeEqual } from 'node:crypto'

const EMAIL = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const PATH = /^\/admin\/[a-z-]+$/

function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''))
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y)
}

export default async (req) => {
  const env = process.env
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!env.NOTIFY_WEBHOOK_SECRET || !safeEqual(req.headers.get('x-notify-secret'), env.NOTIFY_WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return new Response('Resend belum dikonfigurasi', { status: 503 })

  let body
  try { body = await req.json() } catch { return new Response('Bad request', { status: 400 }) }
  const label = String(body?.label ?? '').slice(0, 80)
  const ref = body?.ref ? String(body.ref).slice(0, 40) : ''
  const path = PATH.test(String(body?.path ?? '')) ? body.path : '/admin'
  const to = [...new Set((Array.isArray(body?.recipients) ? body.recipients : []).map(String).filter((e) => EMAIL.test(e) && e.length <= 200))].slice(0, 50)
  if (!label || to.length === 0) return new Response('Bad request', { status: 400 })

  const site = (env.VITE_SITE_URL || env.URL || '').trim().replace(/\/$/, '')
  const link = `${site}${path}`
  const subject = `[DEMA] ${label}${ref ? ` (${ref})` : ''}`
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px">
<h2 style="color:#064e3b;margin:0 0 8px">${esc(label)}</h2>
${ref ? `<p style="margin:0 0 8px">Nomor referensi: <strong>${esc(ref)}</strong></p>` : ''}
<p style="margin:0 0 16px">Ada data baru yang menunggu ditinjau di dasbor admin.</p>
<p><a href="${esc(link)}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Buka dasbor</a></p>
<p style="color:#64748b;font-size:12px;margin-top:24px">Anda menerima email ini karena memiliki akses pada modul tersebut. Isi data lengkap hanya dapat dilihat setelah masuk ke dasbor.</p></div>`
  const text = `${label}${ref ? ` (${ref})` : ''}\nAda data baru yang menunggu ditinjau. Buka dasbor: ${link}`

  // Satu email per penerima agar alamat staf tidak saling terlihat.
  const results = await Promise.allSettled(to.map(async (addr) => {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000)
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [addr], subject, html, text }),
      })
      if (!r.ok) throw new Error(`resend ${r.status}`)
    } finally { clearTimeout(t) }
  }))
  const sent = results.filter((r) => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, failed: to.length - sent }), { status: sent > 0 ? 200 : 502, headers: { 'Content-Type': 'application/json' } })
}
