import { supabase } from '../lib/supabase'
import { prepareImage } from '../utils/image'

export type UploadKind = 'image' | 'pdf'
export type AdminBucket = 'public-media' | 'public-docs'

const MAX_PDF = 10 * 1024 * 1024

/** Mengunggah berkas ke bucket publik dengan nama acak. Mengembalikan path di bucket. */
export async function uploadFile(file: File, kind: UploadKind, bucket: AdminBucket, folder: string, opts: { keepAlpha?: boolean; maxDim?: number } = {}): Promise<string> {
  let body: Blob = file
  let ext = 'pdf'
  let contentType = 'application/pdf'

  if (kind === 'image') {
    const img = await prepareImage(file, opts.maxDim, { keepAlpha: opts.keepAlpha })
    body = img.blob; ext = img.ext; contentType = img.type
  } else {
    if (file.type !== 'application/pdf') throw new Error('Berkas harus berformat PDF.')
    if (file.size > MAX_PDF) throw new Error('Ukuran PDF maksimal 10 MB.')
  }

  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType, upsert: false, cacheControl: '31536000',
  })
  if (error) throw new Error('Gagal mengunggah berkas. Pastikan Anda memiliki izin dan ukurannya sesuai.')
  return path
}

/** Hapus berkas (upaya terbaik; kegagalan tidak menghentikan alur utama). */
export async function removeFiles(bucket: AdminBucket, paths: Array<string | null | undefined>) {
  const list = paths.filter((p): p is string => Boolean(p) && !/^https?:\/\//i.test(p as string))
  if (list.length === 0) return
  try { await supabase.storage.from(bucket).remove(list) } catch { /* abaikan */ }
}
