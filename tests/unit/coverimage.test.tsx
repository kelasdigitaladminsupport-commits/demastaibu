import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CoverImage } from '../../src/components/ui/CoverImage'

vi.mock('../../src/lib/supabase', async () => await import('../smoke/supabaseMock'))
beforeAll(() => undefined)
afterEach(cleanup)

const cls = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/)

describe('CoverImage tidak pernah memotong gambar', () => {
  it('mode bawaan (kartu/daftar): gambar utuh (contain) di atas latar buram; hanya SATU gambar bermakna bagi pembaca layar', () => {
    const { container } = render(<CoverImage path="news/a.jpg" alt="Foto kegiatan" className="aspect-video w-full" />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
    const [backdrop, foreground] = Array.from(imgs)
    expect(backdrop.getAttribute('aria-hidden')).toBe('true'); expect(backdrop.getAttribute('alt')).toBe('')
    expect(cls(backdrop)).toContain('blur-xl')
    expect(foreground.getAttribute('alt')).toBe('Foto kegiatan')
    expect(cls(foreground)).toContain('object-contain'); expect(cls(foreground)).not.toContain('object-cover')
    expect(cls(container.firstElementChild)).toEqual(expect.arrayContaining(['aspect-video', 'w-full', 'overflow-hidden']))
  })
  it('mode natural (halaman detail, pratinjau unggahan): satu gambar, tinggi mengikuti proporsi asli, tanpa potong', () => {
    const { container } = render(<CoverImage path="news/a.jpg" alt="Sampul" fit="natural" className="w-full max-h-[36rem]" />)
    const imgs = container.querySelectorAll('img'); expect(imgs.length).toBe(1)
    expect(cls(imgs[0])).toEqual(expect.arrayContaining(['h-auto', 'object-contain']))
    expect(cls(imgs[0])).not.toContain('object-cover')
    expect(cls(imgs[0]).some((c) => c.startsWith('aspect-'))).toBe(false)
  })
  it('mode logo: muat utuh, dan kelas pemanggil tidak dapat membuatnya terpotong', () => {
    const { container } = render(<CoverImage path="sponsors/a.png" alt="Logo" fit="logo" className="h-24 w-full" />)
    const img = container.querySelector('img')!
    expect(cls(img)).toContain('object-contain'); expect(cls(img)).not.toContain('object-cover')
  })
  it('tidak ada gambar yang memuat object-cover DAN object-contain sekaligus (penyebab logo terpotong sebelumnya)', () => {
    for (const fit of ['blur', 'natural', 'logo'] as const) {
      const { container, unmount } = render(<CoverImage path="a.png" alt="x" fit={fit} className="h-24 w-full object-contain" />)
      container.querySelectorAll('img').forEach((img) => { const c = cls(img); expect(c.includes('object-cover') && c.includes('object-contain')).toBe(false) || undefined })
      unmount()
    }
  })
  it('tanpa path atau gambar gagal dimuat: tampil pengganti beraksesibilitas', () => {
    const a = render(<CoverImage path={null} alt="Tanpa gambar" className="aspect-video" />)
    expect(a.getByRole('img', { name: 'Tanpa gambar' })).toBeTruthy(); a.unmount()
    const b = render(<CoverImage path="rusak.jpg" alt="Rusak" />)
    fireEvent.error(b.container.querySelectorAll('img')[1])
    expect(b.getByRole('img', { name: 'Rusak' })).toBeTruthy()
  })
})

describe('perlindungan terhadap regresi di seluruh kode', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [] })
  const files = walk('src')

  it('`object-cover` hanya boleh dipakai di CoverImage (latar buram) dan Avatar (foto bulat) — tempat lain berisiko memotong gambar', () => {
    const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('object-cover')).map((f) => f.replace(/\\/g, '/'))
    expect(offenders.sort()).toEqual(['src/components/ui/Avatar.tsx', 'src/components/ui/CoverImage.tsx'])
  })
  it('tidak ada <CoverImage> yang memaksa object-cover lewat className', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/<CoverImage[^>]*className=("[^"]*"|\{[^}]*\})/g)) expect(m[1], `${f}`).not.toMatch(/object-cover/)
    }
  })
})
