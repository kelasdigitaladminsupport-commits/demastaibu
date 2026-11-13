import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { CoverImage } from './ui/CoverImage'
import { formatDate } from '../utils/format'
import type { NewsListItem } from '../types/content'

export function NewsCard({ item }: { item: NewsListItem }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md">
      <Link to={`/berita/${item.slug}`} className="block">
        <CoverImage path={item.cover_path} alt={item.title} className="aspect-video w-full" />
        <div className="p-5">
          {item.category && <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{item.category.name}</span>}
          <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold text-slate-900 group-hover:text-emerald-800">{item.title}</h3>
          {item.excerpt && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.excerpt}</p>}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="size-3.5" aria-hidden /> {formatDate(item.published_at)}
          </p>
        </div>
      </Link>
    </article>
  )
}
