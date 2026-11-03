import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, User as UserIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { BrandMark } from './BrandMark'
import { ButtonLink } from './ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useFeatureEnabled } from '../features/settings/useSiteSettings'
import { signOut } from '../services/auth'
import { cn } from '../utils/cn'

interface NavItem { to: string; label: string }

const ABOUT: NavItem[] = [
  { to: '/profil', label: 'Profil DEMA' },
  { to: '/visi-misi', label: 'Visi & Misi' },
  { to: '/struktur', label: 'Struktur Kepengurusan' },
  { to: '/bidang', label: 'Bidang & Anggota' },
]
const MAIN: NavItem[] = [
  { to: '/berita', label: 'Berita' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/program-kerja', label: 'Program Kerja' },
  { to: '/aspirasi', label: 'Aspirasi' },
  { to: '/forum', label: 'Forum' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100')

function Dropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        {label} <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} role="menuitem" className={linkClass}>{i.label}</NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isStaff, loading } = useAuth()
  const pmbOn = useFeatureEnabled('pmb_enabled')
  const donationOn = useFeatureEnabled('donation_enabled')

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const more: NavItem[] = [
    { to: '/galeri', label: 'Galeri Kegiatan' },
    { to: '/kolaborasi', label: 'Kolaborasi & Sponsorship' },
    { to: '/pengabdian', label: 'Pengabdian Masyarakat' },
    { to: '/laporan', label: 'Laporan & Evaluasi' },
    ...(donationOn ? [{ to: '/donasi', label: 'Donasi & Transparansi' }] : []),
    ...(pmbOn ? [{ to: '/pmb', label: 'Info Calon Mahasiswa' }] : []),
    { to: '/kontak', label: 'Kontak' },
  ]

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('Anda telah keluar.')
      navigate('/')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal keluar.')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <BrandMark />

        <nav aria-label="Navigasi utama" className="hidden items-center gap-0.5 lg:flex">
          <NavLink to="/" end className={linkClass}>Beranda</NavLink>
          <Dropdown label="Tentang" items={ABOUT} />
          {MAIN.map((i) => <NavLink key={i.to} to={i.to} className={linkClass}>{i.label}</NavLink>)}
          <Dropdown label="Lainnya" items={more} />
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {loading ? null : user ? (
            <>
              {isStaff && <ButtonLink to="/admin" variant="outline" size="sm">Dasbor</ButtonLink>}
              <span className="flex max-w-40 items-center gap-1.5 truncate text-sm text-slate-600" title={user.email ?? ''}>
                <UserIcon className="size-4 shrink-0" aria-hidden /> <span className="truncate">{user.email}</span>
              </span>
              <button type="button" onClick={handleSignOut} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Keluar">
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <ButtonLink to="/masuk" variant="ghost" size="sm">Masuk</ButtonLink>
              <ButtonLink to="/daftar" size="sm">Daftar</ButtonLink>
            </>
          )}
        </div>

        <button
          type="button" className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="max-h-[80vh] overflow-y-auto border-t border-slate-200 bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav aria-label="Navigasi seluler" className="flex flex-col gap-0.5">
            <NavLink to="/" end className={linkClass}>Beranda</NavLink>
            <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Tentang</p>
            {ABOUT.map((i) => <NavLink key={i.to} to={i.to} className={linkClass}>{i.label}</NavLink>)}
            <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Informasi</p>
            {MAIN.map((i) => <NavLink key={i.to} to={i.to} className={linkClass}>{i.label}</NavLink>)}
            <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Lainnya</p>
            {more.map((i) => <NavLink key={i.to} to={i.to} className={linkClass}>{i.label}</NavLink>)}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
            {user ? (
              <>
                <p className="truncate px-1 text-sm text-slate-600">{user.email}</p>
                {isStaff && <ButtonLink to="/admin" variant="outline">Dasbor Admin</ButtonLink>}
                <button type="button" onClick={handleSignOut} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Keluar</button>
              </>
            ) : (
              <>
                <ButtonLink to="/masuk" variant="outline">Masuk</ButtonLink>
                <ButtonLink to="/daftar">Daftar</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

