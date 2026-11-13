export interface Page<T> { items: T[]; total: number }

export interface NewsListItem {
  id: string; title: string; slug: string; excerpt: string | null
  cover_path: string | null; published_at: string | null; author_name: string | null
  category: { name: string; slug: string } | null
}
export interface NewsDetail extends NewsListItem { content: string }
export interface NewsCategory { id: string; name: string; slug: string }

export interface EventItem {
  id: string; title: string; slug: string; event_date: string; end_date: string | null
  location: string | null; description: string | null; poster_path: string | null
  status: 'upcoming' | 'ongoing' | 'done' | 'cancelled'
}

export interface Department { id: string; name: string; slug: string; description: string | null; sort_order: number }

export interface ProgramItem {
  id: string; title: string; slug: string; description: string | null
  status: 'planned' | 'ongoing' | 'done' | 'cancelled'
  start_date: string | null; end_date: string | null
  department: { name: string; slug: string } | null
}

export interface Gallery { id: string; title: string; description: string | null; cover_path: string | null; event_id: string | null; created_at: string }
export interface GalleryPhoto { id: string; image_path: string; caption: string | null; sort_order: number }

export interface CommunityProgram {
  id: string; title: string; slug: string; description: string | null; location: string | null
  activity_date: string | null; cover_path: string | null
  status: 'planned' | 'ongoing' | 'done' | 'cancelled'
}

export interface PublicReport {
  id: string; title: string; report_type: 'activity' | 'evaluation' | 'financial' | 'other'
  period_label: string | null; summary: string | null; file_path: string | null; created_at: string
}

export interface Officer {
  id: string; full_name: string; period: string; photo_path: string | null
  duty_description: string | null; is_coordinator: boolean; sort_order: number
  position: { id: string; title: string; level: number }
  department: { id: string; name: string; slug: string } | null
}
