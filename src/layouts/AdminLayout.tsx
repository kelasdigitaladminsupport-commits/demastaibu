import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ExternalLink, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { toast } from 'sonner'
import { BrandMark } from '../components/BrandMark'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../services/auth'
import { ADMIN_MODULES } from '../utils/adminModules'
import { ROLE_LABEL } from '../utils/roles'
import { cn } from '../utils/cn'

const item = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-emerald-700 text-white' : 'text-emerald-100 hover:bg-emerald-800/60')

export function AdminLayout() {
  const { user, roles, hasRole } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [pathname])

  const modules = ADMIN_MODULES.filter((m) => hasRole(...m.roles))

  async function handleSignOut() {
    try { await signOut(); navigate('/masuk') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal keluar.') }
  }

  const sidebar = (
    <nav aria-label="Menu admin" className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <NavLink to="/admin" end className={item}><LayoutDashboard className="size-4" /> Ringkasan</NavLink>
      <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-emerald-300/70">Modul</p>
      {modules.map((m) => <NavLink key={m.path} to={`/admin/${m.path}`} className={item}>{m.label}</NavLink>)}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden bg-emerald-950 lg:block">
        <div className="border-b border-white/10 p-4"><BrandMark light /></div>
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-emerald-950">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
          <button type="button" className="rounded-md p-2 hover:bg-slate-100 lg:hidden" aria-label={open ? 'Tutup menu' : 'Buka menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user?.email} · {roles.filter((r) => r !== 'member').map((r) => ROLE_LABEL[r]).join(', ')}</span>
            <Link to="/" className="inline-flex items-center gap-1 text-emerald-800 hover:underline"><ExternalLink className="size-4" /> Situs</Link>
            <button type="button" onClick={handleSignOut} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100">
              <LogOut className="size-4" /> Keluar
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
