import { supabase } from '../lib/supabase'
import { prepareImage } from '../utils/image'

export interface TrackResult {
  ticket_code: string; category: string; title: string; status: string
  status_reason: string | null; public_response: string | null
  created_at: string; updated_at: string
  history: Array<{ note: string; status: string | null; at: string }>
}
export interface PublicAspiration {
  id: string; category: string; title: string; content: string; status: string
  public_response: string | null; created_at: string
}
export interface MyAspiration { id: string; ticket_code: string; title: string; status: string; created_at: string }

function mapError(message: string): string {
  if (/rate_limit_exceeded/.test(message)) return 'Terlalu banyak percobaan. Coba lagi dalam beberapa saat.'
  if (/aspiration_closed/.test(message)) return 'Formulir aspirasi sedang ditutup.'
  if (/anonymous_attachment_not_allowed/.test(message)) return 'Kiriman anonim tidak dapat membawa lampiran.'
  if (/invalid_attachment/.test(message)) return 'Lampiran tidak valid. Masuk terlebih dahulu untuk melampirkan berkas.'
  return 'Permintaan gagal diproses. Periksa isian Anda lalu coba lagi.'
}

/** Unggah lampiran ke bucket privat (hanya pengguna yang login; folder = id pengguna). */
export async function uploadAttachment(file: File, userId: string): Promise<string> {
  let body: Blob = file; let ext = 'pdf'; let contentType = 'application/pdf'
  if (file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 5 MB.')
  } else {
    const img = await prepareImage(file)
    body = img.blob; ext = img.ext; contentType = img.type
  }
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('aspiration-attachments').upload(path, body, { contentType, upsert: false })
  if (error) throw new Error('Lampiran gagal diunggah.')
  return path
}

export async function submitAspiration(v: {
  title: string; content: string; category: string; isAnonymous: boolean
  name?: string; contact?: string; attachmentPath?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_aspiration', {
    p_title: v.title, p_content: v.content, p_category: v.category, p_is_anonymous: v.isAnonymous,
    p_name: v.name || null, p_contact: v.contact || null, p_attachment_path: v.attachmentPath || null,
  })
  if (error) throw new Error(mapError(error.message))
  return data as string
}

export async function trackAspiration(ticket: string): Promise<TrackResult | null> {
  const { data, error } = await supabase.rpc('track_aspiration', { p_ticket: ticket.trim() })
  if (error) throw new Error(mapError(error.message))
  return (data as TrackResult | null) ?? null
}

export async function fetchPublicAspirations(page: number, size = 8): Promise<{ items: PublicAspiration[]; total: number }> {
  const { data, error, count } = await supabase.from('public_aspirations')
    .select('id, category, title, content, status, public_response, created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (error) throw error
  return { items: (data ?? []) as unknown as PublicAspiration[], total: count ?? 0 }
}

/** Aspirasi milik pengguna login yang dikirim TIDAK anonim (RLS: user_id = auth.uid()). */
export async function fetchMyAspirations(): Promise<MyAspiration[]> {
  const { data, error } = await supabase.from('aspirations').select('id, ticket_code, title, status, created_at')
    .order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return (data ?? []) as unknown as MyAspiration[]
}
