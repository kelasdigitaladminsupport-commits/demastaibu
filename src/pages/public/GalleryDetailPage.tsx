import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Container } from '../../components/ui/Container'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { CoverImage } from '../../components/ui/CoverImage'
import { NotFoundPage } from './NotFoundPage'
import { fetchGallery } from '../../services/content'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { publicUrl } from '../../utils/storage'

export function GalleryDetailPage() {
  const { id = '' } = useParams()
  const q = useQuery({ queryKey: ['gallery', id], queryFn: () => fetchGallery(id) })
  useDocumentTitle(q.data?.gallery.title)
  const [index, setIndex] = useState<number | null>(null)
  const photos = q.data?.photos ?? []

  const close = useCallback(() => setIndex(null), [])
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, close, step])

  if (!q.isLoading && !q.error && !q.data) return <NotFoundPage />
  const current = index !== null ? photos[index] : null

  return (
    <Container>
      <Link to="/galeri" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline">
        <ArrowLeft className="size-4" /> Semua galeri
      </Link>
      <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!q.data} emptyTitle="Galeri tidak ditemukan">
        {q.data && (
          <>
            <h1 className="font-display text-3xl font-bold text-emerald-950">{q.data.gallery.title}</h1>
            {q.data.gallery.description && <p className="mt-2 max-w-2xl text-slate-600">{q.data.gallery.description}</p>}
            {photos.length === 0 ? (
              <p className="mt-8 text-slate-500">Belum ada foto pada galeri ini.</p>
            ) : (
              <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {photos.map((p, i) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setIndex(i)} className="block w-full overflow-hidden rounded-xl" aria-label={`Buka foto ${i + 1}`}>
                      <CoverImage path={p.image_path} alt={p.caption ?? `Foto ${i + 1}`} className="aspect-square w-full transition hover:scale-105" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </QueryBoundary>

      {current && (
        <div role="dialog" aria-modal="true" aria-label="Pratinjau foto" className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={close}>
          <button type="button" onClick={close} aria-label="Tutup" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="size-6" /></button>
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Sebelumnya" onClick={(e) => { e.stopPropagation(); step(-1) }} className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronLeft className="size-7" /></button>
              <button type="button" aria-label="Berikutnya" onClick={(e) => { e.stopPropagation(); step(1) }} className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronRight className="size-7" /></button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={publicUrl(current.image_path) ?? ''} alt={current.caption ?? ''} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            {current.caption && <figcaption className="mt-3 text-center text-sm text-white/80">{current.caption}</figcaption>}
          </figure>
        </div>
      )}
    </Container>
  )
}
