import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, ShieldCheck, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabase } from '../../lib/supabase'
import { describeDbError } from '../../services/adminErrors'
import { ROLE_LABEL } from '../../utils/roles'
import { formatDate } from '../../utils/format'
import type { AppRole } from '../../types/auth'

interface Profile { id: string; email: string | null; full_name: string | null; is_banned: boolean; created_at: string }
const PAGE = 15
const ASSIGNABLE: AppRole[] = ['super_admin', 'admin', 'editor', 'moderator', 'pmb_officer']

export function UsersPage() {
  useDocumentTitle('Pengguna & Role — Admin')
  const { user } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<Profile | null>(null)
  const [banTarget, setBanTarget] = useState<Profile | null>(null)

  const list = useQuery({
    queryKey: ['admin-users', page, q],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase.from('profiles').select('id, email, full_name, is_banned, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      // karakter khusus filter PostgREST dibuang agar pencarian aman
      const safe = q.replace(/[,()\\%_*]/g, ' ').trim()
      if (safe) query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
      const { data, error, count } = await query
      if (error) throw error
      const profiles = (data ?? []) as unknown as Profile[]
      const ids = profiles.map((p) => p.id)
      const roles: Record<string, AppRole[]> = {}
      if (ids.length) {
        const r = await supabase.from('user_roles').select('user_id, role').in('user_id', ids)
        if (r.error) throw r.error
        for (const row of (r.data ?? []) as Array<{ user_id: string; role: AppRole }>) (roles[row.user_id] ??= []).push(row.role)
      }
      return { profiles, roles, total: count ?? 0 }
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: AppRole; grant: boolean }) => {
      const res = grant
        ? await supabase.from('user_roles').insert({ user_id: userId, role, granted_by: user?.id })
        : await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role)
      if (res.error) throw res.error
    },
    onSuccess: () => { toast.success('Role diperbarui.'); refresh() },
    onError: (e) => toast.error(describeDbError(e)),
  })

  const ban = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_banned: banned }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => { toast.success(v.banned ? 'Akun diblokir.' : 'Blokir dicabut.'); setBanTarget(null); refresh() },
    onError: (e) => { toast.error(describeDbError(e)); setBanTarget(null) },
  })

  const profiles = list.data?.profiles ?? []
  const rolesOf = (id: string) => list.data?.roles[id] ?? []
  const current = target ? profiles.find((p) => p.id === target.id) ?? target : null

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-emerald-950">Pengguna & Role</h1>
      <p className="text-sm text-slate-600">Hanya Super Admin yang dapat memberi atau mencabut role. Akun yang diblokir tidak dapat menulis di forum atau mendaftar PMB.</p>
      <div className="max-w-sm"><SearchBar value={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Cari email atau nama" /></div>

      <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={profiles.length === 0}
        emptyIcon={Users} emptyTitle="Pengguna tidak ditemukan">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Pengguna</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Bergabung</th><th className="px-4 py-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.full_name || '—'}</p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                    {p.is_banned && <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Diblokir</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rolesOf(p.id).filter((r) => r !== 'member').map((r) => (
                        <span key={r} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{ROLE_LABEL[r]}</span>
                      ))}
                      {rolesOf(p.id).every((r) => r === 'member') && <span className="text-xs text-slate-400">Anggota</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setTarget(p)}><ShieldCheck className="size-4" /> Role</Button>
                    {p.id !== user?.id && (
                      <Button variant="ghost" size="sm" className={p.is_banned ? '' : 'text-red-600 hover:bg-red-50'} onClick={() => setBanTarget(p)}>
                        <Ban className="size-4" /> {p.is_banned ? 'Buka blokir' : 'Blokir'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={list.data?.total ?? 0} pageSize={PAGE} onChange={setPage} />
      </QueryBoundary>

      {current && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setTarget(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="role-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="role-title" className="font-display text-lg font-semibold text-slate-900">Atur role</h2>
                <p className="text-sm text-slate-500">{current.full_name || current.email}</p>
              </div>
              <button type="button" onClick={() => setTarget(null)} aria-label="Tutup" className="rounded-md p-1 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <ul className="mt-4 space-y-2">
              {ASSIGNABLE.map((role) => {
                const has = rolesOf(current.id).includes(role)
                const selfSuper = role === 'super_admin' && current.id === user?.id
                return (
                  <li key={role}>
                    <label className={`flex items-center gap-3 rounded-lg border p-3 ${has ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                      <input type="checkbox" className="size-4 rounded border-slate-300 text-emerald-700" checked={has}
                        disabled={toggleRole.isPending || selfSuper}
                        onChange={(e) => {
                          if (role === 'super_admin' && e.target.checked && !window.confirm('Super Admin memiliki akses penuh. Lanjutkan?')) return
                          toggleRole.mutate({ userId: current.id, role, grant: e.target.checked })
                        }} />
                      <span className="text-sm font-medium text-slate-800">{ROLE_LABEL[role]}</span>
                      {selfSuper && <span className="ml-auto text-xs text-slate-400">tidak dapat mengubah diri sendiri</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-xs text-slate-500">Perubahan berlaku setelah pengguna memuat ulang halaman atau masuk kembali.</p>
          </div>
        </div>
      )}

      <ConfirmDialog open={banTarget !== null} danger={!banTarget?.is_banned} loading={ban.isPending}
        title={banTarget?.is_banned ? 'Buka blokir akun ini?' : 'Blokir akun ini?'}
        description={banTarget?.is_banned ? 'Pengguna dapat kembali menulis di forum dan mendaftar PMB.' : 'Pengguna tidak dapat lagi menulis di forum atau mendaftar PMB. Konten lama tetap ada.'}
        confirmLabel={banTarget?.is_banned ? 'Buka blokir' : 'Blokir'} onCancel={() => setBanTarget(null)}
        onConfirm={() => banTarget && ban.mutate({ id: banTarget.id, banned: !banTarget.is_banned })} />
    </div>
  )
}
