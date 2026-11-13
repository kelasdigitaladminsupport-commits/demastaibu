import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CoverImage } from '../../components/ui/CoverImage'
import { PageLoading } from '../../components/ui/Loading'
import { supabase } from '../../lib/supabase'
import { removeFiles, uploadFile } from '../../services/adminStorage'
import { describeDbError } from '../../services/adminErrors'
import type { Row } from './types'

interface Photo { id: string; image_path: string; caption: string | null; sort_order: number }
const MAX_BATCH = 20

export function GalleryPhotos({ gallery }: { gallery: Row }) {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [cover, setCover] = useState<string | null>((gallery.cover_path as string | null) ?? null)
  const key = ['admin-gallery-photos', gallery.id]

  const photos = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('gallery_items').select('id, image_path, caption, sort_order')
        .eq('gallery_id', gallery.id).order('sort_order').order('created_at')
      if (error) throw error
      return (data ?? []) as unknown as Photo[]
    },
  })
  const list = photos.data ?? []

  function refresh() {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['gallery'] })
    qc.invalidateQueries({ queryKey: ['galleries'] })
    qc.invalidateQueries({ queryKey: ['admin', 'galleries'] })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const chosen = Array.from(files).slice(0, MAX_BATCH)
    if (files.length > MAX_BATCH) toast.message(`Hanya ${MAX_BATCH} foto pertama yang diproses.`)
    setBusy(true)
    let ok = 0
    let next = list.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1
    for (const file of chosen) {
      try {
        const path = await uploadFile(file, 'image', 'public-media', 'galleries')
        const { error } = await supabase.from('gallery_items').insert({ gallery_id: gallery.id, image_path: path, sort_order: next++ })
        if (error) { await removeFiles('public-media', [path]); throw error }
        ok++
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error && !('code' in e) ? e.message : describeDbError(e)}`)
      }
    }
    setBusy(false)
    if (input.current) input.current.value = ''
    if (ok > 0) toast.success(`${ok} foto ditambahkan.`)
    refresh()
  }

  const saveCaption = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { error } = await supabase.from('gallery_items').update({ caption: caption.trim() || null }).eq('id', id)
      if (error) throw error
    },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const remove = useMutation({
    mutationFn: async (p: Photo) => {
      const { error } = await supabase.from('gallery_items').delete().eq('id', p.id)
      if (error) throw error
      await removeFiles('public-media', [p.image_path])
      if (cover === p.image_path) {
        await supabase.from('galleries').update({ cover_path: null }).eq('id', gallery.id)
        setCover(null)
      }
    },
    onSuccess: () => { toast.success('Foto dihapus.'); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const makeCover = useMutation({
    mutationFn: async (p: Photo) => {
      const { error } = await supabase.from('galleries').update({ cover_path: p.image_path }).eq('id', gallery.id)
      if (error) throw error
      setCover(p.image_path)
    },
    onSuccess: () => { toast.success('Sampul galeri diperbarui.'); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const move = useMutation({
    mutationFn: async ({ a, b }: { a: Photo; b: Photo }) => {
      // tukar urutan; bila sama, geser salah satunya
      const [sa, sb] = a.sort_order === b.sort_order ? [b.sort_order + 1, a.sort_order] : [b.sort_order, a.sort_order]
      const r1 = await supabase.from('gallery_items').update({ sort_order: sa }).eq('id', a.id)
      if (r1.error) throw r1.error
      const r2 = await supabase.from('gallery_items').update({ sort_order: sb }).eq('id', b.id)
      if (r2.error) throw r2.error
    },
    onSuccess: refresh,
    onError: (e) => toast.error(describeDbError(e)),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-emerald-950">Foto: {String(gallery.title)}</h1>
          <p className="text-sm text-slate-500">{list.length} foto · unggah hingga {MAX_BATCH} foto sekaligus (JPG/PNG/WebP, otomatis dikecilkan).</p>
        </div>
        <div>
          <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
          <Button loading={busy} onClick={() => input.current?.click()}><ImagePlus className="size-4" /> Tambah foto</Button>
        </div>
      </div>

      {photos.isLoading ? <PageLoading /> : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Belum ada foto. Klik “Tambah foto”.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative">
                <CoverImage path={p.image_path} alt={p.caption ?? 'Foto galeri'} className="aspect-4/3 w-full" />
                {cover === p.image_path && <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-emerald-950">Sampul</span>}
              </div>
              <div className="space-y-2 p-3">
                <input defaultValue={p.caption ?? ''} maxLength={300} placeholder="Keterangan foto (opsional)" aria-label="Keterangan foto"
                  onBlur={(e) => { if (e.target.value.trim() !== (p.caption ?? '')) saveCaption.mutate({ id: p.id, caption: e.target.value }) }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30" />
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <Button variant="ghost" size="sm" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ a: p, b: list[i - 1] })} aria-label="Geser ke depan"><ArrowUp className="size-4" /></Button>
                    <Button variant="ghost" size="sm" disabled={i === list.length - 1 || move.isPending} onClick={() => move.mutate({ a: p, b: list[i + 1] })} aria-label="Geser ke belakang"><ArrowDown className="size-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => makeCover.mutate(p)} disabled={cover === p.image_path} aria-label="Jadikan sampul"><Star className="size-4" /></Button>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" loading={remove.isPending && remove.variables?.id === p.id}
                    onClick={() => { if (window.confirm('Hapus foto ini?')) remove.mutate(p) }} aria-label="Hapus foto"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
