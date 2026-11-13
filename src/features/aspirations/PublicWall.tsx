import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareHeart } from 'lucide-react'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { fetchPublicAspirations } from '../../services/aspirations'
import { formatDate } from '../../utils/format'
import { CATEGORY_LABEL, STATUS_CLS, STATUS_LABEL } from './constants'

export function PublicWall() {
  const [page, setPage] = useState(1)
  const q = useQuery({ queryKey: ['public-aspirations', page], queryFn: () => fetchPublicAspirations(page), placeholderData: (p) => p })
  return (
    <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={(q.data?.items.length ?? 0) === 0}
      emptyIcon={MessageSquareHeart} emptyTitle="Belum ada aspirasi publik" emptyDescription="Aspirasi yang telah ditinjau dan ditanggapi pengurus akan tampil di sini, tanpa identitas pengirim.">
      <ul className="space-y-4">
        {q.data?.items.map((a) => (
          <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-gold-dark">{CATEGORY_LABEL[a.category] ?? a.category}</span>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUS_CLS[a.status] ?? ''}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
              <span className="text-slate-400">{formatDate(a.created_at)}</span>
            </div>
            <h3 className="mt-2 font-semibold text-slate-900">{a.title}</h3>
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-slate-600">{a.content}</p>
            {a.public_response && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-slate-800"><strong className="text-emerald-800">Tanggapan:</strong> {a.public_response}</div>
            )}
          </li>
        ))}
      </ul>
      <Pagination page={page} total={q.data?.total ?? 0} pageSize={8} onChange={setPage} />
    </QueryBoundary>
  )
}
