import { supabase } from '../lib/supabase'
import { fetchAuthorNames } from './forum'

export interface NewsCommentRow {
  id: string; news_id: string; parent_id: string | null; author_id: string
  content: string; is_hidden: boolean; created_at: string; updated_at: string
}

export const NEWS_COMMENT_MAX = 2000

export function describeNewsError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string }
  if (e.message?.includes('news_rate_limit')) return 'Anda terlalu sering berkomentar. Coba lagi beberapa saat lagi.'
  if (e.code === '42501') return 'Aksi ditolak. Berita mungkin sudah tidak tayang atau akun Anda dibatasi.'
  if (e.code === '23514') return 'Isian tidak memenuhi aturan panjang teks.'
  return 'Terjadi kesalahan. Silakan coba lagi.'
}

/** Komentar + jumlah like berita & komentar + like milik pengguna yang sedang login. */
export async function fetchNewsEngagement(newsId: string, userId?: string) {
  const { data, error } = await supabase.from('news_comments')
    .select('id, news_id, parent_id, author_id, content, is_hidden, created_at, updated_at')
    .eq('news_id', newsId).order('created_at', { ascending: true }).limit(500)
  if (error) throw error
  const comments = (data ?? []) as unknown as NewsCommentRow[]
  const ids = comments.map((c) => c.id)

  const [names, newsLikes, commentLikes, mine] = await Promise.all([
    fetchAuthorNames(comments.map((c) => c.author_id)),
    supabase.from('news_like_counts').select('likes').eq('news_id', newsId).maybeSingle(),
    ids.length ? supabase.from('news_like_counts').select('comment_id, likes').in('comment_id', ids) : Promise.resolve({ data: [] }),
    userId ? supabase.from('news_likes').select('news_id, comment_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
  ])

  const likeMap: Record<string, number> = {}
  for (const l of ((commentLikes.data ?? []) as Array<{ comment_id: string | null; likes: number }>)) if (l.comment_id) likeMap[l.comment_id] = l.likes
  const liked = new Set<string>()
  for (const l of ((mine.data ?? []) as Array<{ news_id: string | null; comment_id: string | null }>)) liked.add((l.news_id ?? l.comment_id) as string)

  return { comments, names, likeMap, newsLikes: ((newsLikes.data as { likes: number } | null)?.likes) ?? 0, liked }
}

export type NewsEngagementData = Awaited<ReturnType<typeof fetchNewsEngagement>>

const COMMENT_COLS = 'id, news_id, parent_id, author_id, content, is_hidden, created_at, updated_at'

/** Mengembalikan baris komentar yang baru dibuat agar dapat langsung ditampilkan tanpa menunggu muat ulang. */
export async function addNewsComment(v: { newsId: string; parentId: string | null; content: string; userId: string }): Promise<NewsCommentRow> {
  const { data, error } = await supabase.from('news_comments')
    .insert({ news_id: v.newsId, parent_id: v.parentId, content: v.content, author_id: v.userId })
    .select(COMMENT_COLS).single()
  if (error) throw error
  return data as unknown as NewsCommentRow
}

export async function updateNewsComment(id: string, content: string) {
  const { error } = await supabase.from('news_comments').update({ content }).eq('id', id)
  if (error) throw error
}

export async function deleteNewsComment(id: string) {
  const { error } = await supabase.from('news_comments').delete().eq('id', id)
  if (error) throw error
}

export async function moderateNewsComment(id: string, hidden: boolean) {
  const { error } = await supabase.from('news_comments').update({ is_hidden: hidden }).eq('id', id)
  if (error) throw error
}

export async function setNewsLike(target: { newsId?: string; commentId?: string }, userId: string, like: boolean) {
  if (like) {
    const { error } = await supabase.from('news_likes').insert({ user_id: userId, news_id: target.newsId ?? null, comment_id: target.commentId ?? null })
    if (error && error.code !== '23505') throw error   // 23505 = sudah di-like (abaikan)
  } else {
    let q = supabase.from('news_likes').delete().eq('user_id', userId)
    q = target.newsId ? q.eq('news_id', target.newsId) : q.eq('comment_id', target.commentId as string)
    const { error } = await q
    if (error) throw error
  }
}
