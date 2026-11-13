import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ADMIN_MODULES } from '../../utils/adminModules'
import { ROLE_LABEL, ROLES_ADMIN, ROLES_EDITOR, ROLES_MODERATOR, ROLES_PMB } from '../../utils/roles'
import type { AppRole } from '../../types/auth'

interface Stat { label: string; table: string; filter?: [string, string]; to: string; roles: AppRole[] }

const STATS: Stat[] = [
  { label: 'Berita terbit', table: 'news', filter: ['status', 'published'], to: 'berita', roles: ROLES_EDITOR },
  { label: 'Berita draf', table: 'news', filter: ['status', 'draft'], to: 'berita', roles: ROLES_EDITOR },
  { label: 'Agenda', table: 'events', to: 'agenda', roles: ROLES_EDITOR },
  { label: 'Program kerja', table: 'programs', to: 'program', roles: ROLES_EDITOR },
  { label: 'Galeri', table: 'galleries', to: 'galeri', roles: ROLES_EDITOR },
  { label: 'Aspirasi baru', table: 'aspirations', filter: ['status', 'received'], to: 'aspirasi', roles: ROLES_MODERATOR },
  { label: 'Permohonan kemitraan baru', table: 'partnership_requests', filter: ['status', 'received'], to: 'sponsorship', roles: ROLES_ADMIN },
  { label: 'Pesan kontak baru', table: 'contact_messages', filter: ['status', 'new'], to: 'kontak', roles: ROLES_ADMIN },
  { label: 'Pendaftar PMB baru', table: 'applicants', filter: ['status', 'submitted'], to: 'pmb', roles: ROLES_PMB },
  { label: 'Laporan forum terbuka', table: 'forum_reports', filter: ['status', 'open'], to: 'forum', roles: ROLES_MODERATOR },
]

function StatCard({ stat }: { stat: Stat }) {
  const q = useQuery({
    queryKey: ['admin-stat', stat.table, stat.filter?.join(':') ?? ''],
    queryFn: async () => {
      let query = supabase.from(stat.table).select('id', { count: 'exact', head: true })
      if (stat.filter) query = query.eq(stat.filter[0], stat.filter[1])
      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
  })
  return (
    <Link to={`/admin/${stat.to}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-600">
      <p className="text-3xl font-bold text-emerald-800">{q.isLoading ? '…' : q.error ? '—' : q.data}</p>
      <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
    </Link>
  )
}

export function DashboardPage() {
  const { user, roles, hasRole } = useAuth()
  const modules = ADMIN_MODULES.filter((m) => hasRole(...m.roles))
  const stats = STATS.filter((s) => hasRole(...s.roles))

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Dasbor Admin</h1>
      <p className="mt-1 text-sm text-slate-600">Masuk sebagai {user?.email}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {roles.map((r) => (
          <span key={r} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{ROLE_LABEL[r]}</span>
        ))}
      </div>

      {stats.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Ringkasan</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stats.map((s) => <StatCard key={s.label} stat={s} />)}
          </div>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Modul yang dapat Anda akses</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.path} to={`/admin/${m.path}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-600 hover:shadow">
            <p className="font-semibold text-slate-900">{m.label}</p>
            {!['5A', '5B', '6', '7', '8'].includes(m.stage) && <p className="mt-1 text-xs text-slate-500">Dibangun pada Tahap {m.stage}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
