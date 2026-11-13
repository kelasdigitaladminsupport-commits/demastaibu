import { Link } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import { CoverImage } from './ui/CoverImage'
import { StatusBadge } from './ui/StatusBadge'
import { formatDateTime } from '../utils/format'
import type { EventItem } from '../types/content'

export function EventCard({ item }: { item: EventItem }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md">
      <Link to={`/agenda/${item.slug}`} className="block">
        <CoverImage path={item.poster_path} alt={item.title} className="aspect-video w-full" />
        <div className="p-5">
          <StatusBadge status={item.status} />
          <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-slate-900 group-hover:text-emerald-800">{item.title}</h3>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays className="size-4 shrink-0" aria-hidden /> {formatDateTime(item.event_date)}</p>
          {item.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="size-4 shrink-0" aria-hidden /> {item.location}</p>}
        </div>
      </Link>
    </article>
  )
}
