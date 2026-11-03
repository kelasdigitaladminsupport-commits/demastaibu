import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getSnapshot } from '../../src/lib/netActivity'

// Menguji klien Supabase ASLI (src/lib/supabase.ts) — bukan tiruan — agar terbukti terhubung ke pelacak loading.
let supabase: typeof import('../../src/lib/supabase').supabase

beforeAll(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://proyek-uji.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_kunci_uji')
  ;({ supabase } = await import('../../src/lib/supabase'))
})
afterEach(() => { vi.unstubAllGlobals() })

/** fetch tiruan yang menahan respons sampai dilepas, sambil mencatat permintaan. */
function holdFetch() {
  const pending: Array<() => void> = []
  const calls: Array<{ url: string; method: string }> = []
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push({ url, method: (init?.method ?? 'GET').toUpperCase() })
    return new Promise<Response>((res) => pending.push(() => res(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }))))
  }))
  return { calls, release: () => pending.splice(0).forEach((r) => r()) }
}

describe('klien Supabase asli terhubung ke pelacak loading', () => {
  it('membaca data (GET) = reads', async () => {
    const h = holdFetch()
    const base = { ...getSnapshot() }
    const p = supabase.from('news').select('id')
    const run = Promise.resolve(p)
    await vi.waitFor(() => expect(getSnapshot().reads).toBe(base.reads + 1))
    expect(getSnapshot().writes).toBe(base.writes)
    h.release(); await run
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
  })
  it('menyimpan data (POST/PATCH/DELETE) = writes', async () => {
    const h = holdFetch()
    const base = { ...getSnapshot() }
    const run = Promise.resolve(supabase.from('news').update({ title: 'x' }).eq('id', '1'))
    await vi.waitFor(() => expect(getSnapshot().writes).toBe(base.writes + 1))
    h.release(); await run
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
    expect(h.calls[0].method).toBe('PATCH')
  })
  it('memanggil fungsi (RPC: kirim aspirasi, pendaftaran) = writes', async () => {
    const h = holdFetch()
    const base = { ...getSnapshot() }
    const run = Promise.resolve(supabase.rpc('submit_contact_message', { p_name: 'a' }))
    await vi.waitFor(() => expect(getSnapshot().writes).toBe(base.writes + 1))
    h.release(); await run
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
  })
  it('LOGIN (signInWithPassword) memicu loading, dan selesai saat server menjawab', async () => {
    const h = holdFetch()
    const base = { ...getSnapshot() }
    const run = supabase.auth.signInWithPassword({ email: 'a@b.id', password: 'rahasia123' })
    await vi.waitFor(() => expect(getSnapshot().writes).toBe(base.writes + 1))
    expect(h.calls.some((c) => c.url.includes('/auth/v1/token') && c.method === 'POST')).toBe(true)
    h.release(); await run.catch(() => undefined)
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
  })
  it('REGISTER (signUp) dan RESET SANDI (resetPasswordForEmail) memicu loading', async () => {
    const h = holdFetch()
    const base = { ...getSnapshot() }
    const a = supabase.auth.signUp({ email: 'a@b.id', password: 'rahasia123' })
    await vi.waitFor(() => expect(getSnapshot().writes).toBe(base.writes + 1))
    h.release(); await a.catch(() => undefined)
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
    const h2 = holdFetch()
    const b = supabase.auth.resetPasswordForEmail('a@b.id')
    await vi.waitFor(() => expect(getSnapshot().writes).toBe(base.writes + 1))
    h2.release(); await b.catch(() => undefined)
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
  })
  it('unggah berkas ke Storage = writes', async () => {
    const h = holdFetch()
    const base = { ...getSnapshot() }
    const run = supabase.storage.from('public-media').upload('a/b.png', new Blob(['x'], { type: 'image/png' }), { contentType: 'image/png' })
    await vi.waitFor(() => expect(getSnapshot().writes).toBe(base.writes + 1))
    h.release(); await run.catch(() => undefined)
    await vi.waitFor(() => expect(getSnapshot()).toEqual(base))
  })
})
