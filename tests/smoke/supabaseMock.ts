/* Supabase palsu untuk uji asap. Hanya mengembalikan data contoh; tidak ada jaringan. */
const now = new Date().toISOString()

export const SAMPLE: Record<string, unknown[]> = {
  site_settings: [
    { key: 'pmb_enabled', value: true }, { key: 'donation_enabled', value: true },
    { key: 'forum_enabled', value: true }, { key: 'aspiration_enabled', value: true },
    { key: 'about', value: 'Profil uji.\n\nParagraf dua.' }, { key: 'vision', value: 'Visi uji' },
    { key: 'mission', value: ['Misi satu', 'Misi dua'] }, { key: 'contact', value: { email: 'a@b.id', phone: '0812' } },
    { key: 'social_links', value: { instagram: 'https://instagram.com/uji', tiktok: 'https://tiktok.com/@uji', youtube: 'https://youtube.com/@uji', threads: 'javascript:alert(1)' } }, { key: 'site_logo', value: 'branding/logo.png' }, { key: 'donation_info', value: 'Info donasi uji' },
  ],
  news: [{ id: 'n1', title: 'Berita uji', slug: 'berita-uji', excerpt: 'Ringkasan', content: 'Paragraf satu.\n\nParagraf dua.', cover_path: null, published_at: now, author_name: 'Admin', status: 'published', created_at: now, category: { name: 'Umum', slug: 'umum' } }],
  news_categories: [{ id: 'c1', name: 'Umum', slug: 'umum' }],
  events: [{ id: 'e1', title: 'Agenda uji', slug: 'agenda-uji', event_date: now, end_date: null, location: 'Aula', description: 'Deskripsi', poster_path: null, status: 'upcoming', is_published: true }],
  programs: [{ id: 'p1', title: 'Program uji', slug: 'program-uji', description: 'D', status: 'planned', start_date: '2026-01-01', end_date: null, is_published: true, department: { name: 'Bidang A', slug: 'bidang-a' } }],
  departments: [{ id: 'd1', name: 'Bidang A', slug: 'bidang-a', description: 'Deskripsi', sort_order: 0 }],
  galleries: [{ id: 'g1', title: 'Galeri uji', description: 'D', cover_path: null, event_id: null, created_at: now, is_published: true }],
  gallery_items: [{ id: 'gi1', image_path: 'galleries/x.jpg', caption: 'Foto', sort_order: 1 }],
  community_programs: [{ id: 'cp1', title: 'Pengabdian uji', slug: 'pengabdian-uji', description: 'D', location: 'Desa', activity_date: '2026-02-02', cover_path: null, status: 'done', is_published: true }],
  public_reports: [{ id: 'r1', title: 'Laporan uji', report_type: 'activity', period_label: '2026', summary: 'S', file_path: 'reports/a.pdf', created_at: now, is_published: true }],
  officers: [{ id: 'o1', full_name: 'Nama Contoh', period: '2025/2026', photo_path: null, duty_description: 'Tugas', is_coordinator: false, sort_order: 0, is_published: true, position: { id: 'po1', title: 'Ketua DEMA', level: 1 }, department: null }],
  positions: [{ id: 'po1', title: 'Ketua DEMA', level: 1, sort_order: 1 }],
  forum_categories: [{ id: 'fc1', name: 'Umum', slug: 'umum', description: 'D', sort_order: 0, is_active: true }],
  forum_topics: [{ id: 't1', title: 'Topik uji', content: 'Isi topik', author_id: 'u9', category_id: 'fc1', status: 'open', is_pinned: false, is_evaluation_material: false, created_at: now, category: { name: 'Umum', slug: 'umum' }, comments: [{ count: 1 }] }],
  forum_comments: [{ id: 'cm1', topic_id: 't1', parent_id: null, author_id: 'u9', content: 'Komentar uji', is_hidden: false, created_at: now, updated_at: now }],
  forum_like_counts: [{ topic_id: 't1', comment_id: null, likes: 2 }],
  forum_reports: [{ id: 'fr1', reporter_id: 'u9', topic_id: 't1', comment_id: null, reason: 'Spam', status: 'open', created_at: now, topic: { id: 't1', title: 'Topik uji', status: 'open' }, comment: null }],
  public_profiles: [{ id: 'u9', full_name: 'Pengguna Uji' }],
  profiles: [{ id: 'u9', email: 'x@x.id', full_name: 'Pengguna Uji', is_banned: false, created_at: now }],
  sponsors: [{ id: 's1', name: 'Mitra uji', logo_path: null, description: 'D', website_url: 'https://contoh.id', sort_order: 0, is_published: true }],
  public_donations: [{ id: 'dn1', donor_display: 'Anonim', amount: 100000, purpose: 'Uji', program_id: null, donated_at: '2026-03-03' }],
  public_donation_summary: [{ total: 100000, donation_count: 1 }],
  donations: [{ id: 'dn1', donor_name: 'Siti', amount: 100000, status: 'verified', donated_at: '2026-03-03', is_published: true, display_publicly: false }],
  donation_reports: [{ id: 'dr1', title: 'Laporan donasi', period_label: '2026', summary: 'S', total_in: 100000, total_out: 50000, file_path: 'x.pdf', approved_at: now, is_published: true }],
  public_aspirations: [{ id: 'as1', category: 'saran', title: 'Aspirasi uji', content: 'Isi', status: 'done', public_response: 'Terima kasih', created_at: now }],
  aspirations: [{ id: 'as1', ticket_code: 'ASP-TEST0001', user_id: null, category: 'saran', title: 'Aspirasi uji', content: 'Isi aspirasi', is_anonymous: true, submitter_name: null, submitter_contact: null, attachment_path: null, status: 'received', status_reason: null, public_response: null, is_public: false, assigned_to: null, created_at: now, updated_at: now }],
  aspiration_updates: [{ id: 'au1', author_id: 'u9', note: 'Catatan', status_to: null, is_internal: true, created_at: now }],
  partnership_requests: [{ id: 'pr1', reference_no: 'KRJ-TEST0001', org_name: 'PT Uji', contact_person: 'Budi', email: 'b@x.id', phone: null, partner_type: 'sponsor', cooperation_type: 'Sponsor', supported_program: null, support_form: null, support_value: 1000000, message: 'Pesan', proposal_path: null, status: 'received', publish_consent: true, assigned_to: null, created_at: now, updated_at: now }],
  partnership_updates: [{ id: 'pu1', author_id: 'u9', note: 'Catatan', status_to: null, is_internal: true, created_at: now }],
  contact_messages: [{ id: 'cn1', name: 'Rina', email: 'r@x.id', subject: 'Subjek', message: 'Pesan', status: 'new', created_at: now }],
  pmb_periods: [{ id: 'pp1', academic_year: '2026/2027', name: 'Gelombang 1', description: 'D', requirements: 'R', schedule: 'J', start_date: '2026-01-01', end_date: '2099-12-31', is_active: true }],
  study_programs: [{ id: 'sp1', name: 'Prodi Uji', level: 'S1', description: 'D', is_active: true, sort_order: 0 }],
  applicants: [{ id: 'a1', registration_no: 'PMB2026-ABC123', status: 'submitted', created_at: now, period_id: 'pp1', program_id: 'sp1', full_name: 'Calon Uji', birth_place: 'Kota', birth_date: '2006-01-01', gender: 'male', email: 'c@x.id', phone: '0812', address: 'Alamat', previous_school: 'SMA', graduation_year: 2024, guardian_name: null, guardian_phone: null, period: { name: 'Gelombang 1', academic_year: '2026/2027' }, program: { name: 'Prodi Uji' } }],
  applicant_documents: [{ id: 'ad1', doc_type: 'Dokumen uji', file_path: 'u/a/x.pdf', original_name: 'x.pdf', mime_type: 'application/pdf', size_bytes: 2048, created_at: now }],
  applicant_status_histories: [{ id: 'ah1', status_from: null, status_to: 'submitted', note_public: null, note_internal: null, changed_by: null, created_at: now }],
  audit_logs: [{ id: 1, actor_id: null, action: 'UPDATE', table_name: 'news', record_id: 'n1', old_data: { title: 'a' }, new_data: { title: 'b' }, created_at: now }],
}

export const state: { user: { id: string; email: string } | null; roles: string[] } = { user: null, roles: ['member'] }
export function setSession(user: { id: string; email: string } | null, roles: string[] = ['member']) { state.user = user; state.roles = roles }

function rowsFor(table: string): unknown[] {
  if (table === 'user_roles') return state.roles.map((role) => ({ role }))
  return SAMPLE[table] ?? []
}

function builder(table: string) {
  const rows = rowsFor(table)
  const result = { data: rows, error: null, count: rows.length }
  const b: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
      if (prop === 'single') return () => Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'none' } })
      if (prop === 'maybeSingle') return () => Promise.resolve({ data: rows[0] ?? null, error: null })
      return () => b
    },
  })
  return b
}

const storageBucket = () => ({
  getPublicUrl: (p: string) => ({ data: { publicUrl: `https://example.test/${p}` } }),
  createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/signed' }, error: null }),
  upload: async () => ({ data: {}, error: null }),
  remove: async () => ({ data: [], error: null }),
})

export const supabase = {
  from: (t: string) => builder(t),
  rpc: async (name: string) => {
    if (name === 'list_assignable_staff') return { data: [{ id: 'u9', name: 'Staf Uji' }], error: null }
    if (name === 'my_applicant_history') return { data: [{ status: 'submitted', note: null, at: now }], error: null }
    return { data: null, error: null }
  },
  storage: { from: storageBucket },
  auth: {
    getSession: async () => ({ data: { session: state.user ? { user: state.user, access_token: 't' } : null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
}
export const isSupabaseConfigured = true
export const hasServiceKeyLeak = false
