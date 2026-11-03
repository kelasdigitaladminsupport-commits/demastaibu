import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarDays, GraduationCap, Handshake, MessageSquareHeart, MessagesSquare, Newspaper, type LucideIcon } from 'lucide-react'
import { ButtonLink } from '../../components/ui/Button'
import { useFeatureEnabled } from '../../features/settings/useSiteSettings'
import { NewsCard } from '../../components/NewsCard'
import { EventCard } from '../../components/EventCard'
import { fetchLatestNews, fetchUpcomingEvents } from '../../services/content'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { SITE_NAME } from '../../utils/constants'

interface Shortcut { to: string; title: string; desc: string; icon: LucideIcon }

const BASE: Shortcut[] = [
  { to: '/berita', title: 'Berita & Artikel', desc: 'Kabar terbaru dari DEMA.', icon: Newspaper },
  { to: '/agenda', title: 'Agenda Kegiatan', desc: 'Jadwal dan dokumentasi kegiatan.', icon: CalendarDays },
  { to: '/aspirasi', title: 'Aspirasi', desc: 'Sampaikan kritik, saran, dan ide Anda.', icon: MessageSquareHeart },
  { to: '/forum', title: 'Forum Diskusi', desc: 'Berdiskusi bersama mahasiswa lain.', icon: MessagesSquare },
  { to: '/program-kerja', title: 'Program Kerja', desc: 'Rencana dan capaian program.', icon: BookOpen },
  { to: '/kolaborasi', title: 'Kolaborasi', desc: 'Kerja sama dengan mitra dan sponsor.', icon: Handshake },
]

export function HomePage() {
  useDocumentTitle()
  const pmbOn = useFeatureEnabled('pmb_enabled')
  const news = useQuery({ queryKey: ['news', 'latest'], queryFn: () => fetchLatestNews(3) })
  const events = useQuery({ queryKey: ['events', 'upcoming'], queryFn: () => fetchUpcomingEvents(3) })
  const shortcuts = pmbOn
    ? [...BASE, { to: '/pmb', title: 'Calon Mahasiswa Baru', desc: 'Informasi dan pendaftaran.', icon: GraduationCap }]
    : BASE

  return (
    <>
      <section className="bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">Website Resmi</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">{SITE_NAME}</h1>
          <div className="mt-5 h-1 w-20 rounded bg-gold" />
          <p className="mt-6 max-w-2xl text-lg text-emerald-100">
            Pusat informasi, aspirasi, dan kolaborasi mahasiswa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/aspirasi" variant="gold" size="lg">Sampaikan Aspirasi</ButtonLink>
            <ButtonLink to="/profil" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">Kenali DEMA</ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold text-emerald-950">Jelajahi</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map(({ to, title, desc, icon: Icon }) => (
            <Link key={to} to={to} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-600 hover:shadow-md">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {(news.data?.length ?? 0) > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-emerald-950">Berita Terbaru</h2>
              <Link to="/berita" className="text-sm font-semibold text-emerald-800 hover:underline">Semua berita →</Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {news.data?.map((n) => <NewsCard key={n.id} item={n} />)}
            </div>
          </div>
        </section>
      )}

      {(events.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-emerald-950">Agenda Mendatang</h2>
            <Link to="/agenda" className="text-sm font-semibold text-emerald-800 hover:underline">Semua agenda →</Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.data?.map((e) => <EventCard key={e.id} item={e} />)}
          </div>
        </section>
      )}
    </>
  )
}
