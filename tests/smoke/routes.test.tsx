import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setSession } from './supabaseMock'
import { AuthProvider } from '../../src/features/auth/AuthProvider'
import { router } from '../../src/routes'
import { ADMIN_MODULES } from '../../src/utils/adminModules'

vi.mock('../../src/lib/supabase', async () => await import('./supabaseMock'))

const ERROR_TEXT = /Unexpected Application Error|Something went wrong|Cannot read properties|is not a function|is not defined/

const errors: string[] = []
beforeAll(() => {
  window.scrollTo = vi.fn() as never
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : String(a))).join(' ')
    if (/not wrapped in act|Not implemented|ReactDOMTestUtils/.test(msg)) return
    errors.push(msg.slice(0, 400))
  })
})
afterEach(() => { cleanup(); errors.length = 0 })

async function visit(path: string) {
  await router.navigate(path)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={qc}><AuthProvider><RouterProvider router={router} /></AuthProvider></QueryClientProvider>,
  )
  await waitFor(() => expect((view.container.textContent ?? '').trim().length).toBeGreaterThan(0), { timeout: 8000 })
  await new Promise((r) => setTimeout(r, 120)) // beri waktu kueri selesai
  return view
}

function expectHealthy(view: ReturnType<typeof render>, path: string) {
  const text = view.container.textContent ?? ''
  expect(text, `Halaman ${path} menampilkan galat aplikasi`).not.toMatch(ERROR_TEXT)
  expect(errors, `console.error pada ${path}: ${errors.join(' | ')}`).toEqual([])
}

const PUBLIC = ['/', '/profil', '/visi-misi', '/struktur', '/bidang', '/berita', '/berita/berita-uji', '/agenda', '/agenda/agenda-uji',
  '/program-kerja', '/galeri', '/galeri/g1', '/pengabdian', '/laporan', '/kontak', '/kebijakan-privasi', '/aturan-komunitas',
  '/aspirasi', '/aspirasi?tab=lacak', '/aspirasi?tab=publik', '/forum', '/forum/baru', '/forum/topik/t1',
  '/kolaborasi', '/kolaborasi?tab=lacak', '/kolaborasi?tab=mitra', '/donasi', '/pmb', '/pmb/daftar', '/pmb/status',
  '/masuk', '/daftar', '/lupa-password', '/reset-password', '/halaman-tidak-ada']

describe('halaman publik (pengunjung anonim)', () => {
  for (const path of PUBLIC) {
    it(`merender ${path}`, async () => { setSession(null); expectHealthy(await visit(path), path) })
  }
})

describe('halaman untuk pengguna login (member)', () => {
  for (const path of ['/forum/baru', '/forum/topik/t1', '/aspirasi', '/pmb/daftar', '/pmb/status', '/pmb/pendaftaran/a1', '/pmb/bukti/a1']) {
    it(`merender ${path}`, async () => { setSession({ id: 'u1', email: 'member@test.local' }, ['member']); expectHealthy(await visit(path), path) })
  }
  it('member ditolak di /admin', async () => {
    setSession({ id: 'u1', email: 'member@test.local' }, ['member'])
    const v = await visit('/admin')
    expect(v.container.textContent).toMatch(/Akses ditolak/)
  })
  it('anonim diarahkan ke /masuk dari /admin', async () => {
    setSession(null)
    const v = await visit('/admin')
    expect(router.state.location.pathname).toBe('/masuk')
    expectHealthy(v, '/admin')
  })
})

describe('dashboard admin (super_admin)', () => {
  const paths = ['/admin', ...ADMIN_MODULES.map((m) => `/admin/${m.path}`)]
  for (const path of paths) {
    it(`merender ${path}`, async () => { setSession({ id: 'u1', email: 'super@test.local' }, ['super_admin']); expectHealthy(await visit(path), path) })
  }
  it('editor ditolak di modul pengaturan', async () => {
    setSession({ id: 'u2', email: 'editor@test.local' }, ['editor'])
    const v = await visit('/admin/pengaturan')
    expect(v.container.textContent).toMatch(/Akses ditolak/)
  })
  it('editor dapat membuka modul berita', async () => {
    setSession({ id: 'u2', email: 'editor@test.local' }, ['editor'])
    expectHealthy(await visit('/admin/berita'), '/admin/berita')
  })
})
