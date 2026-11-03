/** Menampilkan teks biasa sebagai paragraf. Sengaja TIDAK merender HTML agar bebas XSS. */
export function TextContent({ text, className = '' }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className={`space-y-4 leading-relaxed text-slate-700 ${className}`}>
      {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
    </div>
  )
}
