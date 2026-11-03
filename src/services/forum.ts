import { supabase } from '../lib/supabase'

export interface ForumCategory { id: string; name: string; slug: string; description: string | null }
export interface TopicRow {
  id: string; title: string; author_id: string; status: 'open' | 'closed' | 'hidden'
  is_pinned: boolean; is_evaluation_material: boolean; created_at: string
  category: { name: string; slug: string } | null
  comments: Array<{ count: number }>
}
export interface TopicDetail extends Omit<TopicRow, 'comments'> { content: string; category_id: string }
export interface CommentRow {
  id: string; topic_id: string; parent_id: string | null; author_id: string
  content: string; is_hidden: boolean; created_at: string; updated_at: string
}

export const FORUM_PAGE = 10

export function describeForumError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string }
  if (e.message?.includes('forum_rate_limit')) return 'Anda terlalu sering memposting. Coba lagi beberapa saat lagi.'
  if (e.code === '42501') return 'Aksi ditolak. Diskusi mungkin sudah ditutup atau akun Anda dibatasi.'
  if (e.code === '23514') return 'Isian tidak memenuhi aturan panjang teks.'
  return 'Terjadi kesalahan. Silakan coba lagi.'
}

export async function fetchForumCategories(): Promise<ForumCategory[]> {
  const { data, error } = await supabase.from('forum_categories').select('id, name, slug, description')
    .eq('is_active', true).order('sort_order').order('name')
  if (error) throw error
  return (data ?? []) as unknown as ForumCategory[]
}

/** Nama tampilan dari view publik (tanpa email/NIM). Pengguna terblokir tidak muncul => "Pengguna". */
export async function fetchAuthorNames(ids: string[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(ids))
  if (uniq.length === 0) return {}
  const { data, error } = await supabase.from('public_profiles').select('id, full_name').in('id', uniq)
  if (error) throw error
  return Object.fromEntries(((data ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name || 'Pengguna']))
}

export async function fetchTopics(o: { page: number; q: string; categoryId?: string; evaluationOnly?: boolean }) {
  let query = supabase.from('forum_topics')
    .select('id, title, author_id, status, is_pinned, is_evaluation_material, created_at, category:forum_categories(name, slug), comments:forum_comments(count)', { count: 'exact' })
    .neq('status', 'hidden')
    .order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    .range((o.page - 1) * FORUM_PAGE, o.page * FORUM_PAGE - 1)
  if (o.q) query = query.ilike('title', `%${o.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)
  if (o.categoryId) query = query.eq('category_id', o.categoryId)
  if (o.evaluationOnly) query = query.eq('is_evaluation_material', true)
  const { data, error, count } = await query
  if (error) throw error
  const items = (data ?? []) as unknown as TopicRow[]
  const [names, likes] = await Promise.all([
    fetchAuthorNames(items.map((t) => t.author_id)),
    items.length ? supabase.from('forum_like_counts').select('topic_id, likes').in('topic_id', items.map((t) => t.id)) : Promise.resolve({ data: [] }),
  ])
  const likeMap: Record<string, number> = {}
  for (const l of ((likes.data ?? []) as Array<{ topic_id: string | null; likes: number }>)) if (l.topic_id) likeMap[l.topic_id] = l.likes
  return { items, total: count ?? 0, names, likeMap }
}

export async function fetchTopic(id: string): Promise<TopicDetail | null> {
  const { data, error } = await supabase.from('forum_topics')
    .select('id, title, content, author_id, category_id, status, is_pinned, is_evaluation_material, created_at, category:forum_categories(name, slug)')
    .eq('id', id).maybeSingle()
  if (error) throw error
  return (data as unknown as TopicDetail | null)
}

export async function fetchThread(topicId: string, userId?: string) {
  const { data, error } = await supabase.from('forum_comments')
    .select('id, topic_id, parent_id, author_id, content, is_hidden, created_at, updated_at')
    .eq('topic_id', topicId).order('created_at', { ascending: true }).limit(500)
  if (error) throw error
  const comments = (data ?? []) as unknown as CommentRow[]
  const [names, topicLikes, commentLikes, mine] = await Promise.all([
    fetchAuthorNames(comments.map((c) => c.author_id)),
    supabase.from('forum_like_counts').select('likes').eq('topic_id', topicId).maybeSingle(),
    comments.length ? supabase.from('forum_like_counts').select('comment_id, likes').in('comment_id', comments.map((c) => c.id)) : Promise.resolve({ data: [] }),
    userId ? supabase.from('forum_likes').select('topic_id, comment_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
  ])
  const likeMap: Record<string, number> = {}
  for (const l of ((commentLikes.data ?? []) as Array<{ comment_id: string | null; likes: number }>)) if (l.comment_id) likeMap[l.comment_id] = l.likes
  const liked = new Set<string>()
  for (const l of ((mine.data ?? []) as Array<{ topic_id: string | null; comment_id: string | null }>)) liked.add((l.topic_id ?? l.comment_id) as string)
  return { comments, names, likeMap, topicLikes: ((topicLikes.data as { likes: number } | null)?.likes) ?? 0, liked }
}

export async function createTopic(v: { categoryId: string; title: string; content: string; userId: string }): Promise<string> {
  const { data, error } = await supabase.from('forum_topics')
    .insert({ category_id: v.categoryId, title: v.title, content: v.content, author_id: v.userId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function addComment(v: { topicId: string; parentId: string | null; content: string; userId: string }) {
  const { error } = await supabase.from('forum_comments')
    .insert({ topic_id: v.topicId, parent_id: v.parentId, content: v.content, author_id: v.userId })
  if (error) throw error
}

export async function updateComment(id: string, content: string) {
  const { error } = await supabase.from('forum_comments').update({ content }).eq('id', id)
  if (error) throw error
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('forum_comments').delete().eq('id', id)
  if (error) throw error
}

export async function setLike(target: { topicId?: string; commentId?: string }, userId: string, like: boolean) {
  if (like) {
    const { error } = await supabase.from('forum_likes').insert({ user_id: userId, topic_id: target.topicId ?? null, comment_id: target.commentId ?? null })
    if (error && error.code !== '23505') throw error
  } else {
    let q = supabase.from('forum_likes').delete().eq('user_id', userId)
    q = target.topicId ? q.eq('topic_id', target.topicId) : q.eq('comment_id', target.commentId as string)
    const { error } = await q
    if (error) throw error
  }
}

export async function reportContent(v: { topicId?: string; commentId?: string; reason: string; userId: string }) {
  const { error } = await supabase.from('forum_reports')
    .insert({ reporter_id: v.userId, topic_id: v.topicId ?? null, comment_id: v.commentId ?? null, reason: v.reason })
  if (error) throw error
}

/** Moderasi (hanya berhasil bagi moderator/admin; ditegakkan RLS + trigger). */
export async function moderateTopic(id: string, patch: Partial<{ status: string; is_pinned: boolean; is_evaluation_material: boolean }>) {
  const { error } = await supabase.from('forum_topics').update(patch).eq('id', id)
  if (error) throw error
}
export async function moderateComment(id: string, hidden: boolean) {
  const { error } = await supabase.from('forum_comments').update({ is_hidden: hidden }).eq('id', id)
  if (error) throw error
}
