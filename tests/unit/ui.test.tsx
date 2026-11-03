import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SAMPLE, setSession } from '../smoke/supabaseMock'
import { beginActivity } from '../../src/lib/netActivity'
import { Footer } from '../../src/components/Footer'
import { Navbar } from '../../src/components/Navbar'
import { RootLayout } from '../../src/layouts/RootLayout'
import { AuthProvider } from '../../src/features/auth/AuthProvider'

vi.mock('../../src/lib/supabase', async () => await import('../smoke/supabaseMock'))

const ORIGINAL = JSON.parse(JSON.stringify(SAMPLE.site_settings))
beforeAll(() => { window.scrollTo = vi.fn() as never })
afterEach(() => { cleanup(); SAMPLE.site_settings = JSON.parse(JSON.stringify(ORIGINAL)); localStorage.clear(); setSession(null) })

function mount(path: string, element: React.ReactNode) {
  const router = createMemoryRouter([{ element: <RootLayout />, children: [{ path: '*', element }] }], { initialEntries: [path] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><AuthProvider><RouterProvider router={router} /></AuthProvider></QueryClientProvider>)
}
const setting = (key: string, value: unknown) => {
  const rows = SAMPLE.site_settings as Array<{ key: string; value: unknown }>
  const i = rows.findIndex((r) => r.key === key)
  if (i >= 0) rows[i].value = value; else rows.push({ key, value })
}

describe('animasi loading global', () => {
  it('aksi yang mengubah data (mis. login/simpan) > 0,25 dtk memunculkan layar loading penuh, lalu hilang', async () => {
    mount('/', <div />)
    expect(screen.queryByTestId('global-loading')).toBeNull()
    const end = beginActivity('write')
    await waitFor(() => expect(screen.getByTestId('global-loading')).toBeTruthy(), { timeout: 1500 })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)    // dapat dibaca pembaca layar
    end()
    await waitFor(() => expect(screen.queryByTestId('global-loading')).toBeNull(), { timeout: 2500 })
  })
  it('aksi yang sangat cepat TIDAK memunculkan layar loading (tanpa kedipan)', async () => {
    mount('/', <div />)
    const end = beginActivity('write'); end()
    await new Promise((r) => setTimeout(r, 450))
    expect(screen.queryByTestId('global-loading')).toBeNull()
  })
  it('pemuatan data (GET) hanya memunculkan bilah progres, tidak memblokir layar', async () => {
    const { container } = mount('/', <div />)
    const end = beginActivity('read')
    await waitFor(() => expect(container.querySelector('.top-progress')?.getAttribute('data-active')).toBe('true'), { timeout: 1500 })
    expect(screen.queryByTestId('global-loading')).toBeNull()
    end()
  })
})

describe('logo tersinkron di semua tampilan', () => {
  it('logo dari pengaturan tampil di navbar DAN footer, dan menjadi ikon tab', async () => {
    setting('site_logo', 'branding/logo-baru.png')
    mount('/', <><Navbar /><Footer /></>)
    await waitFor(() => expect(document.querySelectorAll('img[src="https://example.test/branding/logo-baru.png"]').length).toBeGreaterThanOrEqual(2))
    await waitFor(() => expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('https://example.test/branding/logo-baru.png'))
  })
  it('mengganti logo di pengaturan mengubah semua tampilan sekaligus', async () => {
    setting('site_logo', 'branding/lama.png')
    mount('/', <><Navbar /><Footer /></>)
    await waitFor(() => expect(document.querySelectorAll('img[src$="lama.png"]').length).toBeGreaterThanOrEqual(2))
    cleanup()
    setting('site_logo', 'branding/baru.png')
    mount('/', <><Navbar /><Footer /></>)
    await waitFor(() => expect(document.querySelectorAll('img[src$="baru.png"]').length).toBeGreaterThanOrEqual(2))
    expect(document.querySelectorAll('img[src$="lama.png"]').length).toBe(0)
  })
  it('tanpa logo: tampil huruf "D" bawaan dan ikon tab bawaan', async () => {
    setting('site_logo', '')
    mount('/', <><Navbar /><Footer /></>)
    await waitFor(() => expect(screen.getAllByText('D').length).toBeGreaterThanOrEqual(2))
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg')
  })
})

describe('ikon media sosial di footer', () => {
  it('tampil di bawah logo, membuka akun yang benar di tab baru dengan rel aman', async () => {
    mount('/', <Footer />)
    const ig = await screen.findByLabelText(/Instagram DEMA/)
    expect(ig.getAttribute('href')).toBe('https://instagram.com/uji')
    expect(ig.getAttribute('target')).toBe('_blank')
    expect(ig.getAttribute('rel')).toMatch(/noopener/)
    expect(screen.getByLabelText(/TikTok DEMA/).getAttribute('href')).toBe('https://tiktok.com/@uji')
    expect(screen.getByLabelText(/YouTube DEMA/).getAttribute('href')).toBe('https://youtube.com/@uji')
    // ikon berada setelah merek (logo/nama) dalam kolom yang sama
    const list = ig.closest('ul')!
    expect(list.previousElementSibling?.textContent).toMatch(/DEMA STAI Bahriyatul Ulum/)
  })
  it('tautan berbahaya (javascript:) TIDAK dirender', async () => {
    mount('/', <Footer />)
    await screen.findByLabelText(/Instagram DEMA/)
    expect(screen.queryByLabelText(/Threads DEMA/)).toBeNull()
    expect(Array.from(document.querySelectorAll('a')).some((a) => (a.getAttribute('href') ?? '').toLowerCase().startsWith('javascript'))).toBe(false)
  })
  it('platform yang dikosongkan tidak ditampilkan; tanpa satu pun tautan, deretan ikon hilang', async () => {
    setting('social_links', {})
    mount('/', <Footer />)
    await waitFor(() => expect(screen.getByText(/Tautan/)).toBeTruthy())
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.queryByLabelText('Media sosial')).toBeNull()
  })
})

describe('SEO di <head>', () => {
  it('beranda: dapat diindeks, kanonik benar, data terstruktur memuat nama, logo, dan akun resmi', async () => {
    mount('/', <div />)
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow'))
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${window.location.origin}/`)
    await waitFor(() => expect(document.getElementById('ld-json')?.textContent).toContain('"@type":"Organization"'))
    const ld = JSON.parse(document.getElementById('ld-json')!.textContent!)
    const org = ld['@graph'][0]
    expect(org.name).toMatch(/DEMA STAI Bahriyatul Ulum/)
    expect(org.logo).toBe('https://example.test/branding/logo.png')
    expect(org.sameAs).toContain('https://instagram.com/uji')
    expect(JSON.stringify(org.sameAs)).not.toMatch(/javascript/)
  })
  it.each(['/admin', '/admin/berita', '/masuk', '/daftar', '/lupa-password', '/pmb/daftar', '/pmb/pendaftaran/x', '/pmb/bukti/x', '/pmb/status', '/forum/baru'])(
    'halaman privat %s ditandai noindex', async (path) => {
      mount(path, <div />)
      await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow'))
    })
  it.each(['/berita', '/berita/judul', '/agenda', '/pmb', '/forum', '/forum/topik/1'])('halaman publik %s dapat diindeks', async (path) => {
    mount(path, <div />)
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow'))
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${window.location.origin}${path}`)
  })
})

describe('pindah halaman lewat navbar/tautan', () => {
  it('memuat halaman baru yang lambat memunculkan layar loading, lalu hilang setelah halaman tampil', async () => {
    const router = createMemoryRouter([{
      element: <RootLayout />,
      children: [
        { path: '/', element: <div>Beranda</div> },
        { path: '/lambat', lazy: async () => { await new Promise((r) => setTimeout(r, 600)); return { Component: () => <div>Halaman lambat selesai</div> } } },
      ],
    }], { initialEntries: ['/'] })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><AuthProvider><RouterProvider router={router} /></AuthProvider></QueryClientProvider>)
    await screen.findByText('Beranda')
    expect(screen.queryByTestId('global-loading')).toBeNull()
    const nav = router.navigate('/lambat')
    await waitFor(() => expect(screen.getByTestId('global-loading')).toBeTruthy(), { timeout: 1500 })   // muncul saat memuat
    await nav
    await screen.findByText('Halaman lambat selesai')
    await waitFor(() => expect(screen.queryByTestId('global-loading')).toBeNull(), { timeout: 2500 })   // hilang setelah selesai
  })
  it('pindah ke halaman yang sudah siap (cepat) tidak berkedip', async () => {
    const router = createMemoryRouter([{ element: <RootLayout />, children: [{ path: '/', element: <div>A</div> }, { path: '/b', element: <div>B</div> }] }], { initialEntries: ['/'] })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><AuthProvider><RouterProvider router={router} /></AuthProvider></QueryClientProvider>)
    await screen.findByText('A')
    await router.navigate('/b')
    await screen.findByText('B')
    await new Promise((r) => setTimeout(r, 400))
    expect(screen.queryByTestId('global-loading')).toBeNull()
  })
})
