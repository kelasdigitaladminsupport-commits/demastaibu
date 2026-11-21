import { describe, expect, it } from 'vitest'
import { parseBlocks, parseInline, stripFormatting } from '../../src/utils/richText'

describe('parseInline', () => {
  it('alamat https:// menjadi tautan dan tanda baca penutup tidak ikut', () => {
    expect(parseInline('Daftar di https://contoh.id/form?x=1.')).toEqual([
      { t: 'text', v: 'Daftar di ' },
      { t: 'link', href: 'https://contoh.id/form?x=1', c: [{ t: 'text', v: 'https://contoh.id/form?x=1' }] },
      { t: 'text', v: '.' },
    ])
  })
  it('[teks](url) dan **tebal**; tanda ** tidak ikut ke dalam alamat', () => {
    const r = parseInline('**https://a.id/x** dan [klik](https://b.id)')
    expect(r[0]).toEqual({ t: 'bold', c: [{ t: 'link', href: 'https://a.id/x', c: [{ t: 'text', v: 'https://a.id/x' }] }] })
    expect(r[2]).toEqual({ t: 'link', href: 'https://b.id', c: [{ t: 'text', v: 'klik' }] })
  })
  it('skema berbahaya tidak pernah menjadi tautan', () => {
    const r = parseInline('[x](javascript:alert(1)) dan javascript:alert(1)')
    expect(r.some((n) => n.t === 'link')).toBe(false)
  })
})

describe('parseBlocks', () => {
  it('judul, paragraf, dan daftar', () => {
    const b = parseBlocks('### PENDAFTARAN\n\nIsi paragraf\nbaris dua\n\n- satu\n- dua\n\n1. a\n2. b')
    expect(b.map((x) => x.t)).toEqual(['h', 'p', 'ul', 'ol'])
    expect(b[0]).toMatchObject({ t: 'h', level: 3 })
  })
  it('**tebal** di awal baris bukan butir daftar', () => {
    expect(parseBlocks('**LINK PENDAFTARAN:**')[0].t).toBe('p')
  })
})

describe('stripFormatting', () => {
  it('membuang penanda dan alamat dari deskripsi', () => {
    expect(stripFormatting('**Daftar** sekarang di https://x.id dan [situs](https://y.id)\n### Judul')).toBe('Daftar sekarang di dan situs Judul')
  })
})
