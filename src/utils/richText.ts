/**
 * Format teks sederhana yang AMAN untuk isi berita, agenda, profil, dll. (tanpa HTML mentah, bebas XSS):
 *   - alamat https://... otomatis menjadi tautan; juga [teks](https://...) dan [teks](mailto:...)
 *   - **tebal**
 *   - ### judul (satu sampai enam tanda #), daftar "- butir" / "* butir" / "• butir" dan "1. butir"
 *   - paragraf dipisah baris kosong; baris baru tunggal dipertahankan
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] }

export type Block =
  | { t: 'p'; c: Inline[] }
  | { t: 'h'; level: 2 | 3; c: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] }

const INLINE = /\[([^\]\n]{1,200})\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|\*\*([^*]+?)\*\*|(https?:\/\/[^\s<>"'*]+)/g

function trimUrl(raw: string): { url: string; rest: string } {
  let url = raw
  let rest = ''
  for (;;) {
    const last = url.slice(-1)
    const unbalancedParen = last === ')' && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)
    if (/[.,;:!?'"\]}]/.test(last) || unbalancedParen) { rest = last + rest; url = url.slice(0, -1) } else break
  }
  return { url, rest }
}

export function parseInline(text: string, allowLinks = true, depth = 0): Inline[] {
  const out: Inline[] = []
  let last = 0
  const push = (v: string) => { if (v) out.push({ t: 'text', v }) }
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0
    push(text.slice(last, idx))
    if (m[1] !== undefined && m[2] !== undefined) {
      if (allowLinks) out.push({ t: 'link', href: m[2], c: parseInline(m[1], false, depth + 1) })
      else push(m[1])
    } else if (m[3] !== undefined) {
      out.push({ t: 'bold', c: depth < 3 ? parseInline(m[3], allowLinks, depth + 1) : [{ t: 'text', v: m[3] }] })
    } else if (m[4] !== undefined) {
      const { url, rest } = trimUrl(m[4])
      if (allowLinks && url.length > 8) { out.push({ t: 'link', href: url, c: [{ t: 'text', v: url }] }); push(rest) }
      else push(m[4])
    }
    last = idx + m[0].length
  }
  push(text.slice(last))
  return out
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: { t: 'ul' | 'ol'; items: Inline[][] } | null = null
  const flushPara = () => { if (para.length) { blocks.push({ t: 'p', c: parseInline(para.join('\n')) }); para = [] } }
  const flushList = () => { if (list) { blocks.push(list); list = null } }

  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const s = line.trim()
    if (!s) { flushPara(); flushList(); continue }
    const h = /^(#{1,6})\s+(.+?)\s*#*$/.exec(s)
    if (h) { flushPara(); flushList(); blocks.push({ t: 'h', level: h[1].length <= 2 ? 2 : 3, c: parseInline(h[2]) }); continue }
    const ul = /^[-*•]\s+(.+)$/.exec(s)
    const ol = /^\d{1,3}[.)]\s+(.+)$/.exec(s)
    const li = ul ?? ol
    if (li) {
      const kind = ul ? 'ul' : 'ol'
      flushPara()
      if (list && list.t !== kind) flushList()
      if (!list) list = { t: kind, items: [] }
      list.items.push(parseInline(li[1]))
      continue
    }
    flushList()
    para.push(s)
  }
  flushPara(); flushList()
  return blocks
}

/** Teks polos tanpa penanda format/tautan, untuk deskripsi pencarian & pratinjau tautan. */
export function stripFormatting(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/\[([^\]\n]+)\]\((?:https?:\/\/|mailto:)[^\s)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s<>"'*]+/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}
