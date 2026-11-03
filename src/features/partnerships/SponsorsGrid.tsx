import { useQuery } from '@tanstack/react-query'
import { Handshake } from 'lucide-react'
import { CoverImage } from '../../components/ui/CoverImage'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { fetchSponsors } from '../../services/partnerships'

export function SponsorsGrid() {
  const q = useQuery({ queryKey: ['sponsors'], queryFn: fetchSponsors })
  return (
    <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={(q.data?.length ?? 0) === 0}
      emptyIcon={Handshake} emptyTitle="Belum ada mitra yang ditampilkan" emptyDescription="Mitra yang telah menyetujui publikasi akan tampil di sini.">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((s) => (
          <li key={s.id} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <CoverImage path={s.logo_path} alt={`Logo ${s.name}`} className="h-24 w-full object-contain" />
            <h3 className="mt-3 font-semibold text-slate-900">{s.name}</h3>
            {s.description && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{s.description}</p>}
            {s.website_url && /^https?:\/\//i.test(s.website_url) && (
              <a href={s.website_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 text-sm font-medium text-emerald-800 hover:underline">Kunjungi situs</a>
            )}
          </li>
        ))}
      </ul>
    </QueryBoundary>
  )
}
