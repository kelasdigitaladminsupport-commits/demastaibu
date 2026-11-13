import { describe, expect, it } from 'vitest'
import { splitRequirements, windowState } from '../../src/features/recruitment/constants'

describe('splitRequirements', () => {
  it('satu syarat per baris; membuang penomoran/butir di awal baris dan baris kosong', () => {
    const txt = '1. Mahasiswa aktif\n2) Tidak sedang cuti\n  - Mengisi formulir  \n• Membawa KRS\n\n(a) Surat pernyataan\nIPK minimal 3,00'
    expect(splitRequirements(txt)).toEqual(['Mahasiswa aktif', 'Tidak sedang cuti', 'Mengisi formulir', 'Membawa KRS', 'Surat pernyataan', 'IPK minimal 3,00'])
  })
  it('tidak memotong kata yang diawali huruf/angka tanpa penanda', () => {
    expect(splitRequirements('Aktif di organisasi\n3 tahun pengalaman\nA. Syarat A')).toEqual(['Aktif di organisasi', '3 tahun pengalaman', 'Syarat A'])
  })
  it('kosong/null menghasilkan daftar kosong', () => {
    expect(splitRequirements('')).toEqual([]); expect(splitRequirements(null)).toEqual([]); expect(splitRequirements(undefined)).toEqual([])
  })
})

describe('windowState', () => {
  it('menentukan belum dibuka / dibuka / ditutup (batas tanggal inklusif)', () => {
    expect(windowState('2026-03-01', '2026-03-31', '2026-02-28')).toBe('upcoming')
    expect(windowState('2026-03-01', '2026-03-31', '2026-03-01')).toBe('open')
    expect(windowState('2026-03-01', '2026-03-31', '2026-03-31')).toBe('open')
    expect(windowState('2026-03-01', '2026-03-31', '2026-04-01')).toBe('closed')
  })
})
