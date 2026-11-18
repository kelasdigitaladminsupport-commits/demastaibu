// Menerima panggilan dari database Supabase (trigger notify_staff & notify_submitter, migrasi 0014/0016)
// lalu mengirim email lewat Resend. Dilindungi rahasia bersama (header x-notify-secret).
// Variabel Netlify: NOTIFY_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL (mis. "DEMA <notifikasi@domain-anda.id>").
// Dua jenis email:
//   - ke STAF (default)           : hanya jenis + nomor referensi + tautan dasbor, tanpa data pribadi.
//   - ke PENGIRIM (kind=confirmation): sapaan nama + jenis formulir + nomor referensi + tautan halaman publik.
//   - VERIFIKASI email (kind=verify_email, kolaborasi anonim): tautan satu-kali; konfirmasi baru dikirim setelah terverifikasi.
//   - PERUBAHAN STATUS (kind=status_update, migrasi 0021): dikirim ke pengaju saat admin mengubah status pengajuan.
//     Hanya kunci form + status yang dikirim database; teks ditentukan di sini. Catatan admin (note) ditampilkan bila ada.
import { timingSafeEqual } from 'node:crypto'

const EMAIL = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const PATH = /^\/admin\/[a-z-]+$/

// Teks konfirmasi ditentukan di sini (bukan dari database) agar isi email tidak bisa dimanipulasi.
const FORMS = {
  pmb: {
    title: 'Pendaftaran Mahasiswa Baru diterima',
    intro: 'Pendaftaran mahasiswa baru Anda telah kami terima dan akan ditinjau oleh panitia PMB.',
    next: 'Simpan Kode Pelacakan yang tampil di layar setelah Anda mengirim formulir. Kode itu tidak dikirim lewat email demi keamanan dan dibutuhkan untuk memeriksa status pendaftaran.',
    path: '/pmb/status', cta: 'Cek status pendaftaran',
  },
  recruitment: {
    title: 'Pendaftaran pengurus DEMA diterima',
    intro: 'Pendaftaran kepengurusan DEMA Anda telah kami terima dan akan diseleksi oleh tim rekrutmen.',
    next: 'Anda akan dihubungi bila ada tahap lanjutan. Pantau status pendaftaran dengan masuk ke akun Anda.',
    path: '/rekrutmen/daftar', cta: 'Lihat pendaftaran saya',
  },
  partnership: {
    title: 'Pengajuan kolaborasi / kerja sama diterima',
    intro: 'Terima kasih, email Anda sudah terverifikasi. Pengajuan kolaborasi atau kerja sama Anda telah kami terima; tim DEMA akan meninjau dan menghubungi Anda melalui email ini.',
    next: 'Untuk melacak status, gunakan nomor referensi di atas bersama email ini di halaman kolaborasi.',
    path: '/kolaborasi', cta: 'Kunjungi halaman kolaborasi',
  },
}

// Templat email perubahan status. Kunci: form -> status. Teks ditentukan di sini (bukan dari database).
// Status yang tidak terdaftar di sini tidak mengirim email (mis. status awal).
const STATUS_MAIL = {
  pmb: {
    form: 'Pendaftaran Mahasiswa Baru', path: '/pmb/status', cta: 'Cek status pendaftaran',
    items: {
      verifying: { label: 'Sedang diverifikasi', body: 'Berkas dan data pendaftaran Anda sedang dalam proses verifikasi oleh panitia. Mohon menunggu informasi selanjutnya dan memantau email Anda secara berkala.' },
      need_revision: { label: 'Perlu perbaikan', body: 'Setelah kami periksa, data atau berkas pendaftaran Anda masih perlu diperbaiki. Mohon masuk ke akun Anda, lakukan perbaikan sesuai catatan panitia, kemudian kirim kembali.' },
      verified: { label: 'Terverifikasi', body: 'Data dan berkas pendaftaran Anda telah dinyatakan lengkap dan terverifikasi. Hasil akhir seleksi akan kami informasikan melalui email ini.' },
      accepted: { label: 'Diterima', body: 'Kami menyampaikan selamat. Anda dinyatakan diterima sebagai mahasiswa baru STAI Bahriyatul Ulum. Informasi tahap daftar ulang akan disampaikan oleh panitia.' },
      rejected: { label: 'Tidak diterima', body: 'Mohon maaf, berdasarkan hasil seleksi panitia, pendaftaran Anda belum dapat kami terima. Kami menghargai minat dan usaha Anda.' },
      withdrawn: { label: 'Mengundurkan diri', body: 'Pengunduran diri Anda dari proses pendaftaran mahasiswa baru telah kami catat.' },
    },
  },
  recruitment: {
    form: 'Pendaftaran Pengurus DEMA', path: '/rekrutmen/daftar', cta: 'Lihat pendaftaran saya',
    items: {
      reviewing: { label: 'Sedang ditinjau', body: 'Pendaftaran Anda sedang kami tinjau oleh tim rekrutmen. Mohon menunggu informasi selanjutnya dan memantau email Anda secara berkala.' },
      interview: { label: 'Tahap wawancara', body: 'Anda dinyatakan lolos ke tahap wawancara. Jadwal dan ketentuan pelaksanaan akan disampaikan oleh tim rekrutmen; mohon pastikan Anda dapat dihubungi.' },
      accepted: { label: 'Diterima', body: 'Kami menyampaikan selamat. Anda dinyatakan diterima sebagai pengurus DEMA STAI Bahriyatul Ulum. Arahan selanjutnya akan disampaikan oleh pengurus.' },
      rejected: { label: 'Tidak diterima', body: 'Mohon maaf, berdasarkan hasil seleksi, Anda belum dapat kami terima sebagai pengurus pada periode ini. Kami berterima kasih atas partisipasi Anda.' },
      withdrawn: { label: 'Mengundurkan diri', body: 'Pengunduran diri Anda dari proses pendaftaran pengurus telah kami catat.' },
    },
  },
  partnership: {
    form: 'Pengajuan Kolaborasi / Kerja Sama', path: '/kolaborasi', cta: 'Kunjungi halaman kolaborasi',
    items: {
      reviewed: { label: 'Sedang ditinjau', body: 'Pengajuan kerja sama Anda sedang kami tinjau. Mohon menunggu informasi selanjutnya dan memantau email Anda secara berkala.' },
      discussing: { label: 'Dalam pembahasan', body: 'Pengajuan Anda telah memasuki tahap pembahasan. Perwakilan kami akan menghubungi Anda melalui alamat email ini untuk membicarakan tindak lanjutnya.' },
      agreed: { label: 'Disetujui', body: 'Kami menyampaikan terima kasih. Pengajuan kerja sama Anda telah disetujui. Perwakilan kami akan menghubungi Anda untuk langkah berikutnya.' },
      declined: { label: 'Tidak dilanjutkan', body: 'Mohon maaf, pengajuan kerja sama Anda belum dapat kami lanjutkan saat ini. Kami berterima kasih atas perhatian dan itikad baik Anda.' },
      completed: { label: 'Selesai', body: 'Kerja sama yang Anda ajukan telah dinyatakan selesai. Kami mengucapkan terima kasih atas dukungan dan kerja sama yang telah terjalin.' },
    },
  },
  aspiration: {
    form: 'Aspirasi', path: '/aspirasi', cta: 'Lihat halaman aspirasi',
    items: {
      reviewed: { label: 'Sedang ditinjau', body: 'Aspirasi Anda sedang kami tinjau oleh pengurus. Mohon menunggu informasi selanjutnya.' },
      need_info: { label: 'Membutuhkan informasi tambahan', body: 'Kami membutuhkan informasi tambahan terkait aspirasi Anda. Mohon periksa keterangan dari pengurus pada halaman aspirasi.' },
      discussed: { label: 'Dibahas', body: 'Aspirasi Anda telah masuk ke dalam pembahasan pengurus.' },
      in_progress: { label: 'Ditindaklanjuti', body: 'Aspirasi Anda sedang ditindaklanjuti oleh pengurus.' },
      done: { label: 'Selesai', body: 'Aspirasi Anda telah selesai ditindaklanjuti. Terima kasih atas partisipasi Anda.' },
      rejected: { label: 'Belum dapat ditindaklanjuti', body: 'Mohon maaf, aspirasi Anda belum dapat kami tindaklanjuti. Keterangan lengkap dapat dilihat pada halaman aspirasi.' },
    },
  },
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''))
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y)
}

// Satu email per penerima agar alamat tidak saling terlihat.
async function sendAll(env, to, subject, html, text) {
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

export default async (req) => {
  const env = process.env
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!env.NOTIFY_WEBHOOK_SECRET || !safeEqual(req.headers.get('x-notify-secret'), env.NOTIFY_WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return new Response('Resend belum dikonfigurasi', { status: 503 })

  let body
  try { body = await req.json() } catch { return new Response('Bad request', { status: 400 }) }
  const ref = body?.ref ? String(body.ref).slice(0, 40) : ''
  const to = [...new Set((Array.isArray(body?.recipients) ? body.recipients : []).map(String).filter((e) => EMAIL.test(e) && e.length <= 200))].slice(0, 50)
  const site = (env.VITE_SITE_URL || env.URL || '').trim().replace(/\/$/, '')

  // ---- Email konfirmasi ke pengirim formulir ----
  if (body?.kind === 'confirmation') {
    const f = FORMS[String(body?.form ?? '')]
    if (!f || to.length !== 1) return new Response('Bad request', { status: 400 })
    const name = String(body?.name ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100)
    const link = `${site}${f.path}`
    const subject = `[DEMA STAI BU] ${f.title}${ref ? ` (${ref})` : ''}`
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px">
<h2 style="color:#064e3b;margin:0 0 12px">${esc(f.title)}</h2>
<p style="margin:0 0 12px">Assalamu’alaikum${name ? `, <strong>${esc(name)}</strong>` : ''}.</p>
<p style="margin:0 0 12px">${esc(f.intro)}</p>
${ref ? `<p style="margin:0 0 12px">Nomor referensi: <strong>${esc(ref)}</strong></p>` : ''}
<p style="margin:0 0 16px">${esc(f.next)}</p>
<p><a href="${esc(link)}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(f.cta)}</a></p>
<p style="color:#64748b;font-size:12px;margin-top:24px">Email ini dikirim otomatis karena alamat Anda dipakai pada formulir DEMA STAI Bahriyatul Ulum. Jika Anda tidak merasa mengisinya, abaikan email ini.</p></div>`
    const text = `${f.title}\n\nAssalamu’alaikum${name ? `, ${name}` : ''}.\n${f.intro}\n${ref ? `Nomor referensi: ${ref}\n` : ''}${f.next}\n${f.cta}: ${link}\n\nEmail otomatis. Jika Anda tidak merasa mengisi formulir, abaikan email ini.`
    return sendAll(env, to, subject, html, text)
  }

  // ---- Email perubahan status ke pengaju ----
  if (body?.kind === 'status_update') {
    const f = STATUS_MAIL[String(body?.form ?? '')]
    const st = f?.items[String(body?.status ?? '')]
    if (!f || !st || to.length !== 1) return new Response('Bad request', { status: 400 })
    const name = String(body?.name ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100)
    const note = String(body?.note ?? '').replace(/\r/g, '').trim().slice(0, 1000)
    const link = `${site}${f.path}`
    const subject = `[DEMA STAI BU] Pembaruan status ${f.form}: ${st.label}${ref ? ` (${ref})` : ''}`
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px">
<h2 style="color:#064e3b;margin:0 0 12px">Pembaruan Status ${esc(f.form)}</h2>
<p style="margin:0 0 12px">Assalamu’alaikum${name ? `, <strong>${esc(name)}</strong>` : ''}.</p>
${ref ? `<p style="margin:0 0 12px">Nomor referensi: <strong>${esc(ref)}</strong></p>` : ''}
<p style="margin:0 0 12px">Status terbaru: <strong>${esc(st.label)}</strong></p>
<p style="margin:0 0 12px">${esc(st.body)}</p>
${note ? `<p style="margin:0 0 12px;padding:10px 14px;background:#f0fdf4;border-left:3px solid #047857;white-space:pre-line"><strong>Catatan dari pengurus:</strong><br>${esc(note)}</p>` : ''}
<p style="margin:0 0 16px">Hormat kami,<br>DEMA STAI Bahriyatul Ulum</p>
<p><a href="${esc(link)}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(f.cta)}</a></p>
<p style="color:#64748b;font-size:12px;margin-top:24px">Email ini dikirim secara otomatis oleh sistem. Mohon untuk tidak membalas email ini. Apabila Anda tidak merasa mengajukan permohonan tersebut, abaikan email ini.</p></div>`
    const text = `Pembaruan Status ${f.form}\n\nAssalamu’alaikum${name ? `, ${name}` : ''}.\n${ref ? `Nomor referensi: ${ref}\n` : ''}Status terbaru: ${st.label}\n\n${st.body}\n${note ? `\nCatatan dari pengurus:\n${note}\n` : ''}\nHormat kami,\nDEMA STAI Bahriyatul Ulum\n\n${f.cta}: ${link}\n\nEmail ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini. Apabila Anda tidak merasa mengajukan permohonan tersebut, abaikan email ini.`
    return sendAll(env, to, subject, html, text)
  }

  // ---- Email verifikasi (kolaborasi anonim) ----
  if (body?.kind === 'verify_email') {
    const token = String(body?.token ?? '')
    if (!/^[0-9a-f]{48}$/.test(token) || to.length !== 1) return new Response('Bad request', { status: 400 })
    const name = String(body?.name ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100)
    const link = `${site}/kolaborasi/verifikasi?token=${token}`
    const subject = `[DEMA STAI BU] Verifikasi email pengajuan kolaborasi${ref ? ` (${ref})` : ''}`
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px">
<h2 style="color:#064e3b;margin:0 0 12px">Verifikasi email Anda</h2>
<p style="margin:0 0 12px">Assalamu’alaikum${name ? `, <strong>${esc(name)}</strong>` : ''}.</p>
<p style="margin:0 0 12px">Seseorang mengirim pengajuan kolaborasi/kerja sama ke DEMA STAI Bahriyatul Ulum memakai alamat email ini${ref ? ` (nomor referensi <strong>${esc(ref)}</strong>)` : ''}. Jika itu Anda, tekan tombol di bawah untuk memverifikasi email.</p>
<p><a href="${esc(link)}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Verifikasi email</a></p>
<p style="color:#64748b;font-size:12px;margin-top:24px">Tautan berlaku 3 hari dan hanya bisa dipakai sekali. Jika Anda tidak merasa mengirim pengajuan, abaikan email ini; tidak ada yang terjadi bila tautan tidak dibuka.</p></div>`
    const text = `Verifikasi email Anda\n\nAssalamu’alaikum${name ? `, ${name}` : ''}.\nSeseorang mengirim pengajuan kolaborasi/kerja sama ke DEMA STAI Bahriyatul Ulum memakai alamat email ini${ref ? ` (nomor referensi ${ref})` : ''}. Jika itu Anda, buka tautan berikut untuk memverifikasi:\n${link}\n\nTautan berlaku 3 hari. Jika bukan Anda, abaikan email ini.`
    return sendAll(env, to, subject, html, text)
  }

  // ---- Email pemberitahuan ke staf ----
  const label = String(body?.label ?? '').slice(0, 80)
  const path = PATH.test(String(body?.path ?? '')) ? body.path : '/admin'
  if (!label || to.length === 0) return new Response('Bad request', { status: 400 })
  const link = `${site}${path}`
  const subject = `[DEMA] ${label}${ref ? ` (${ref})` : ''}`
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px">
<h2 style="color:#064e3b;margin:0 0 8px">${esc(label)}</h2>
${ref ? `<p style="margin:0 0 8px">Nomor referensi: <strong>${esc(ref)}</strong></p>` : ''}
<p style="margin:0 0 16px">Ada data baru yang menunggu ditinjau di dasbor admin.</p>
<p><a href="${esc(link)}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Buka dasbor</a></p>
<p style="color:#64748b;font-size:12px;margin-top:24px">Anda menerima email ini karena memiliki akses pada modul tersebut. Isi data lengkap hanya dapat dilihat setelah masuk ke dasbor.</p></div>`
  const text = `${label}${ref ? ` (${ref})` : ''}\nAda data baru yang menunggu ditinjau. Buka dasbor: ${link}`
  return sendAll(env, to, subject, html, text)
}
