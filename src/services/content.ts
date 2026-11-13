import { supabase } from '../lib/supabase'
import type {
  CommunityProgram, Department, EventItem, Gallery, GalleryPhoto, NewsCategory, NewsDetail,
  NewsListItem, Officer, Page, ProgramItem, PublicReport,
} from '../types/content'

export const PAGE_SIZE = 9

const rangeOf = (page: number) => [(page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1] as const
const like = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
const cast = <T>(v: unknown) => v as T

// CATATAN: pengguna staf yang sedang login dapat membaca draf lewat RLS, jadi setiap query publik
// WAJIB memfilter status/is_published secara eksplisit agar halaman publik tidak menampilkan draf.

const NEWS_COLS = 'id, title, slug, excerpt, cover_path, published_at, author_name, category:news_categories(name, slug)'

export async function fetchNews(opts: { page: number; q: string; categoryId?: string }): Promise<Page<NewsListItem>> {
  const [from, to] = rangeOf(opts.page)
  let query = supabase.from('news').select(NEWS_COLS, { count: 'exact' })
    .eq('status', 'published').lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false }).range(from, to)
  if (opts.q) query = query.ilike('title', like(opts.q))
  if (opts.categoryId) query = query.eq('category_id', opts.categoryId)
  const { data, error, count } = await query
  if (error) throw error
  return { items: cast<NewsListItem[]>(data ?? []), total: count ?? 0 }
}

export async function fetchLatestNews(limit = 3): Promise<NewsListItem[]> {
  const { data, error } = await supabase.from('news').select(NEWS_COLS)
    .eq('status', 'published').lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false }).limit(limit)
  if (error) throw error
  return cast<NewsListItem[]>(data ?? [])
}

export async function fetchNewsBySlug(slug: string): Promise<NewsDetail | null> {
  const { data, error } = await supabase.from('news').select(`${NEWS_COLS}, content`)
    .eq('slug', slug).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle()
  if (error) throw error
  return cast<NewsDetail | null>(data)
}

export async function fetchNewsCategories(): Promise<NewsCategory[]> {
  const { data, error } = await supabase.from('news_categories').select('id, name, slug').order('name')
  if (error) throw error
  return cast<NewsCategory[]>(data ?? [])
}

const EVENT_COLS = 'id, title, slug, event_date, end_date, location, description, poster_path, status'
export type EventFilter = 'upcoming' | 'done' | 'all'

export async function fetchEvents(opts: { page: number; q: string; filter: EventFilter }): Promise<Page<EventItem>> {
  const [from, to] = rangeOf(opts.page)
  let query = supabase.from('events').select(EVENT_COLS, { count: 'exact' }).eq('is_published', true).range(from, to)
  if (opts.filter === 'upcoming') query = query.in('status', ['upcoming', 'ongoing']).order('event_date', { ascending: true })
  else if (opts.filter === 'done') query = query.eq('status', 'done').order('event_date', { ascending: false })
  else query = query.order('event_date', { ascending: false })
  if (opts.q) query = query.ilike('title', like(opts.q))
  const { data, error, count } = await query
  if (error) throw error
  return { items: cast<EventItem[]>(data ?? []), total: count ?? 0 }
}

export async function fetchUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const { data, error } = await supabase.from('events').select(EVENT_COLS).eq('is_published', true)
    .in('status', ['upcoming', 'ongoing']).order('event_date', { ascending: true }).limit(limit)
  if (error) throw error
  return cast<EventItem[]>(data ?? [])
}

export async function fetchEventBySlug(slug: string): Promise<EventItem | null> {
  const { data, error } = await supabase.from('events').select(EVENT_COLS).eq('slug', slug).eq('is_published', true).maybeSingle()
  if (error) throw error
  return cast<EventItem | null>(data)
}

export async function fetchEventGalleries(eventId: string): Promise<Gallery[]> {
  const { data, error } = await supabase.from('galleries')
    .select('id, title, description, cover_path, event_id, created_at').eq('event_id', eventId).eq('is_published', true)
  if (error) throw error
  return cast<Gallery[]>(data ?? [])
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('id, name, slug, description, sort_order').order('sort_order').order('name')
  if (error) throw error
  return cast<Department[]>(data ?? [])
}

export async function fetchPrograms(opts: { page: number; q: string; status: string; departmentId: string }): Promise<Page<ProgramItem>> {
  const [from, to] = rangeOf(opts.page)
  let query = supabase.from('programs')
    .select('id, title, slug, description, status, start_date, end_date, department:departments(name, slug)', { count: 'exact' })
    .eq('is_published', true).order('start_date', { ascending: false, nullsFirst: false }).range(from, to)
  if (opts.q) query = query.ilike('title', like(opts.q))
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.departmentId) query = query.eq('department_id', opts.departmentId)
  const { data, error, count } = await query
  if (error) throw error
  return { items: cast<ProgramItem[]>(data ?? []), total: count ?? 0 }
}

const GALLERY_COLS = 'id, title, description, cover_path, event_id, created_at'

export async function fetchGalleries(page: number): Promise<Page<Gallery>> {
  const [from, to] = rangeOf(page)
  const { data, error, count } = await supabase.from('galleries').select(GALLERY_COLS, { count: 'exact' })
    .eq('is_published', true).order('created_at', { ascending: false }).range(from, to)
  if (error) throw error
  return { items: cast<Gallery[]>(data ?? []), total: count ?? 0 }
}

export async function fetchGallery(id: string): Promise<{ gallery: Gallery; photos: GalleryPhoto[] } | null> {
  const { data, error } = await supabase.from('galleries').select(GALLERY_COLS).eq('id', id).eq('is_published', true).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { data: photos, error: e2 } = await supabase.from('gallery_items')
    .select('id, image_path, caption, sort_order').eq('gallery_id', id).order('sort_order')
  if (e2) throw e2
  return { gallery: cast<Gallery>(data), photos: cast<GalleryPhoto[]>(photos ?? []) }
}

export async function fetchCommunityPrograms(page: number): Promise<Page<CommunityProgram>> {
  const [from, to] = rangeOf(page)
  const { data, error, count } = await supabase.from('community_programs')
    .select('id, title, slug, description, location, activity_date, cover_path, status', { count: 'exact' })
    .eq('is_published', true).order('activity_date', { ascending: false, nullsFirst: false }).range(from, to)
  if (error) throw error
  return { items: cast<CommunityProgram[]>(data ?? []), total: count ?? 0 }
}

export async function fetchReports(opts: { page: number; type: string }): Promise<Page<PublicReport>> {
  const [from, to] = rangeOf(opts.page)
  let query = supabase.from('public_reports')
    .select('id, title, report_type, period_label, summary, file_path, created_at', { count: 'exact' })
    .eq('is_published', true).order('created_at', { ascending: false }).range(from, to)
  if (opts.type) query = query.eq('report_type', opts.type)
  const { data, error, count } = await query
  if (error) throw error
  return { items: cast<PublicReport[]>(data ?? []), total: count ?? 0 }
}

export async function fetchOfficers(): Promise<Officer[]> {
  const { data, error } = await supabase.from('officers')
    .select('id, full_name, period, photo_path, duty_description, is_coordinator, sort_order, position:positions(id, title, level), department:departments(id, name, slug)')
    .eq('is_published', true).order('sort_order').order('full_name')
  if (error) throw error
  return cast<Officer[]>(data ?? [])
}

export async function submitContactMessage(v: { name: string; email: string; subject: string; message: string }) {
  const { error } = await supabase.rpc('submit_contact_message', {
    p_name: v.name, p_email: v.email, p_subject: v.subject, p_message: v.message,
  })
  if (error) {
    if (/rate_limit_exceeded/.test(error.message)) throw new Error('Terlalu banyak pesan. Coba lagi dalam beberapa saat.')
    throw new Error('Pesan gagal dikirim. Periksa isian Anda dan coba lagi.')
  }
}
