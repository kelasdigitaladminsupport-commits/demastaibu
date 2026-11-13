import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ImageFrame } from '../../src/components/ui/ImageFrame'

vi.mock('../../src/lib/supabase', async () => await import('../smoke/supabaseMock'))
afterEach(cleanup)

describe('ImageFrame: blok mengikuti proporsi gambar', () => {
  it('memakai rasio asli gambar setelah dimuat (potret tetap potret)', () => {
    const { container } = render(<ImageFrame path="a.jpg" alt="Foto" />)
    const img = container.querySelector('img')!
    Object.defineProperty(img, 'naturalWidth', { value: 600 }); Object.defineProperty(img, 'naturalHeight', { value: 900 })
    fireEvent.load(img)
    expect(img.className).not.toContain('opacity-0') // tampil setelah ukuran asli diketahui
    expect(img.className).toContain('object-contain'); expect(img.className).not.toContain('object-cover')
  })
  it('gambar rusak menampilkan pengganti beraksesibilitas', () => {
    const { container, getByRole } = render(<ImageFrame path="rusak.jpg" alt="Rusak" />)
    fireEvent.error(container.querySelector('img')!)
    expect(getByRole('img', { name: 'Rusak' })).toBeTruthy()
  })
  it('dengan onClick menjadi tombol, dan menampilkan keterangan', () => {
    const fn = vi.fn()
    const { getByRole, getByText } = render(<ImageFrame path="a.jpg" alt="Foto" caption="Keterangan" onClick={fn} />)
    fireEvent.click(getByRole('button')); expect(fn).toHaveBeenCalled(); expect(getByText('Keterangan')).toBeTruthy()
  })
})
