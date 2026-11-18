import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import notify from '../../netlify/functions/notify.mjs'

const ENV = { NOTIFY_WEBHOOK_SECRET: 'rahasia-uji', RESEND_API_KEY: 're_uji', RESEND_FROM_EMAIL: 'DEMA <n@domain.id>', URL: 'https://dema.netlify.app' }
const call = (body: unknown, secret: string | null = 'rahasia-uji', method = 'POST') =>
  notify(new Request('https://dema.netlify.app/.netlify/functions/notify', {
    method, headers: { 'content-type': 'application/json', ...(secret ? { 'x-notify-secret': secret } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined,
  }))
const payload = { label: 'Aspirasi baru', ref: 'ASP-123', path: '/admin/aspirasi', recipients: ['a@x.id', 'b@x.id', 'bukan-email'] }

beforeEach(() => { Object.assign(process.env, ENV); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 }))) })
afterEach(() => { vi.unstubAllGlobals(); for (const k of Object.keys(ENV)) delete process.env[k] })

describe('fungsi notify', () => {
  it('menolak tanpa/salah rahasia dan metode selain POST', async () => {
    expect((await call(payload, null)).status).toBe(401)
    expect((await call(payload, 'salah')).status).toBe(401)
    expect((await call(payload, 'rahasia-uji', 'GET')).status).toBe(405)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('mengirim satu email per penerima valid ke Resend, tanpa data pribadi', async () => {
    const res = await call(payload)
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_uji')
    const sent = JSON.parse(init.body as string)
    expect(sent.to).toEqual(['a@x.id']); expect(sent.subject).toBe('[DEMA] Aspirasi baru (ASP-123)')
    expect(sent.html).toContain('https://dema.netlify.app/admin/aspirasi')
  })
  it('mengabaikan path di luar /admin dan meloloskan HTML berbahaya', async () => {
    await call({ ...payload, label: '<b>x</b>', path: 'https://jahat.example' })
    const sent = JSON.parse(((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body as string)
    expect(sent.html).not.toContain('<b>x</b>'); expect(sent.html).toContain('https://dema.netlify.app/admin"')
  })
  it('502 bila semua pengiriman gagal; 400 bila tanpa penerima valid', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
    expect((await call(payload)).status).toBe(502)
    expect((await call({ ...payload, recipients: ['x'] })).status).toBe(400)
  })
})

describe('email perubahan status (kind=status_update)', () => {
  const st = { kind: 'status_update', form: 'pmb', status: 'verifying', ref: 'PMB-123', name: 'Siti', recipients: ['siti@x.id'] }
  const sentOf = () => JSON.parse(((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body as string)
  it('mengirim email formal ke satu penerima dengan nomor referensi dan peringatan jangan dibalas', async () => {
    expect((await call(st)).status).toBe(200)
    const sent = sentOf()
    expect(sent.to).toEqual(['siti@x.id'])
    expect(sent.subject).toBe('[DEMA STAI BU] Pembaruan status Pendaftaran Mahasiswa Baru: Sedang diverifikasi (PMB-123)')
    expect(sent.html).toContain('Siti'); expect(sent.html).toContain('PMB-123'); expect(sent.html).toContain('https://dema.netlify.app/pmb/status')
    expect(sent.text).toContain('tidak membalas')
  })
  it('menampilkan catatan admin dengan HTML ter-escape', async () => {
    await call({ ...st, status: 'need_revision', note: '<script>x</script> Unggah ulang KTP' })
    const sent = sentOf()
    expect(sent.html).toContain('Unggah ulang KTP'); expect(sent.html).not.toContain('<script>')
  })
  it('menolak form/status tak dikenal atau penerima ganda tanpa mengirim', async () => {
    expect((await call({ ...st, status: 'submitted' })).status).toBe(400)
    expect((await call({ ...st, form: 'lain' })).status).toBe(400)
    expect((await call({ ...st, recipients: ['a@x.id', 'b@x.id'] })).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('semua form punya templat untuk status yang bisa dipilih admin', async () => {
    const cases: [string, string[]][] = [
      ['pmb', ['verifying', 'need_revision', 'verified', 'accepted', 'rejected', 'withdrawn']],
      ['recruitment', ['reviewing', 'interview', 'accepted', 'rejected', 'withdrawn']],
      ['partnership', ['reviewed', 'discussing', 'agreed', 'declined', 'completed']],
      ['aspiration', ['reviewed', 'need_info', 'discussed', 'in_progress', 'done', 'rejected']],
    ]
    for (const [form, list] of cases) for (const status of list) expect((await call({ ...st, form, status })).status).toBe(200)
  })
})

describe('email kode OTP (kind=otp_email)', () => {
  const otp = { kind: 'otp_email', form: 'partnership', code: '482913', recipients: ['mitra@x.id'] }
  it('mengirim kode 6 digit ke satu penerima dengan peringatan jangan dibalas', async () => {
    expect((await call(otp)).status).toBe(200)
    const sent = JSON.parse(((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body as string)
    expect(sent.to).toEqual(['mitra@x.id']); expect(sent.html).toContain('482913'); expect(sent.text).toContain('482913')
    expect(sent.subject).not.toContain('482913'); expect(sent.text).toContain('tidak membalas')
  })
  it('menolak kode bukan 6 digit atau penerima ganda tanpa mengirim', async () => {
    expect((await call({ ...otp, code: '12ab56' })).status).toBe(400)
    expect((await call({ ...otp, code: '1234567' })).status).toBe(400)
    expect((await call({ ...otp, recipients: ['a@x.id', 'b@x.id'] })).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
