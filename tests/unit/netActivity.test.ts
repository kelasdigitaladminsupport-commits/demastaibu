import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginActivity, classify, getSnapshot, trackedFetch } from '../../src/lib/netActivity'

afterEach(() => { vi.unstubAllGlobals() })

describe('klasifikasi permintaan jaringan', () => {
  it('GET/HEAD = read', () => {
    expect(classify('https://x.supabase.co/rest/v1/news')).toBe('read')
    expect(classify('https://x.supabase.co/rest/v1/news', { method: 'HEAD' })).toBe('read')
  })
  it('POST/PATCH/DELETE/PUT = write (login, simpan, hapus, unggah)', () => {
    for (const m of ['POST', 'PATCH', 'DELETE', 'PUT']) expect(classify('https://x.supabase.co/rest/v1/news', { method: m })).toBe('write')
    expect(classify('https://x.supabase.co/auth/v1/token?grant_type=password', { method: 'POST' })).toBe('write')
    expect(classify('https://x.supabase.co/auth/v1/logout', { method: 'POST' })).toBe('write')
  })
  it('penyegaran token otomatis = silent (tidak mengganggu pengguna)', () => {
    expect(classify('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', { method: 'POST' })).toBe('silent')
  })
  it('mengenali objek Request dan URL', () => {
    expect(classify(new Request('https://x.test/a', { method: 'POST' }))).toBe('write')
    expect(classify(new URL('https://x.test/a'))).toBe('read')
  })
})

describe('trackedFetch', () => {
  it('menghitung permintaan yang sedang berjalan lalu menurunkannya', async () => {
    const releases: Array<() => void> = []
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => { releases.push(() => res(new Response('{}'))) })))
    const before = { ...getSnapshot() }
    const p = trackedFetch('https://x.test/rest/v1/news', { method: 'POST' })
    const g = trackedFetch('https://x.test/rest/v1/news')
    expect(getSnapshot().writes).toBe(before.writes + 1)
    expect(getSnapshot().reads).toBe(before.reads + 1)
    releases.forEach((r) => r())
    await Promise.all([p, g])
    expect(getSnapshot()).toEqual(before)
  })
  it('tetap menurunkan hitungan saat jaringan gagal', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const before = { ...getSnapshot() }
    await expect(trackedFetch('https://x.test/a', { method: 'POST' })).rejects.toThrow('offline')
    expect(getSnapshot()).toEqual(before)
  })
  it('permintaan silent tidak dihitung', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    const before = { ...getSnapshot() }
    await trackedFetch('https://x.test/auth/v1/token?grant_type=refresh_token', { method: 'POST' })
    expect(getSnapshot()).toEqual(before)
  })
  it('beginActivity: penutupan ganda tidak mengurangi dua kali', () => {
    const before = { ...getSnapshot() }
    const end = beginActivity('write')
    end(); end()
    expect(getSnapshot()).toEqual(before)
  })
})
