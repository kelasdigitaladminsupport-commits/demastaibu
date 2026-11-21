import { Fragment, type ReactNode } from 'react'
import { parseBlocks, type Inline } from '../../utils/richText'

/**
 * Menampilkan teks sebagai paragraf dengan format sederhana yang aman: alamat https:// otomatis jadi tautan,
 * [teks](https://...), **tebal**, ### judul, dan daftar. Sengaja TIDAK merender HTML mentah (bebas XSS):
 * semua dibangun sebagai elemen React, dan tautan hanya boleh http/https/mailto.
 */
function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    if (n.t === 'text') return <Fragment key={i}>{n.v}</Fragment>
    if (n.t === 'bold') return <strong key={i} className="font-semibold text-slate-900">{renderInline(n.c)}</strong>
    return (
      <a key={i} href={n.href} target={n.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer"
        className="break-words font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
        {renderInline(n.c)}
      </a>
    )
  })
}

export function TextContent({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseBlocks(text)
  return (
    <div className={`space-y-4 leading-relaxed text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.t === 'p') return <p key={i} className="whitespace-pre-line break-words">{renderInline(b.c)}</p>
        if (b.t === 'h') {
          return b.level === 2
            ? <h2 key={i} className="pt-2 font-display text-2xl font-bold text-emerald-950">{renderInline(b.c)}</h2>
            : <h3 key={i} className="pt-1 font-display text-xl font-semibold text-emerald-900">{renderInline(b.c)}</h3>
        }
        const Tag = b.t
        return (
          <Tag key={i} className={`space-y-1.5 pl-6 ${b.t === 'ul' ? 'list-disc' : 'list-decimal'}`}>
            {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
          </Tag>
        )
      })}
    </div>
  )
}
