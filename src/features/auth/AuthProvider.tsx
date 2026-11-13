import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { AppRole } from '../../types/auth'
import { AuthContext, type AuthState } from './AuthContext'

interface RolesState { uid: string | null; roles: AppRole[] }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [rolesState, setRolesState] = useState<RolesState>({ uid: null, roles: [] })
  const [rolesVersion, setRolesVersion] = useState(0)

  // 1) Sesi. Callback onAuthStateChange sengaja sinkron (tanpa await ke Supabase di dalamnya).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) Role dibaca dari tabel user_roles (RLS mengizinkan membaca role milik sendiri).
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return
        const roles = error ? [] : ((data ?? []) as Array<{ role: AppRole }>).map((r) => r.role)
        setRolesState({ uid: userId, roles })
      })
    return () => { cancelled = true }
  }, [userId, rolesVersion])

  const refreshRoles = useCallback(() => setRolesVersion((v) => v + 1), [])

  const value = useMemo<AuthState>(() => {
    const roles = userId && rolesState.uid === userId ? rolesState.roles : []
    const rolesLoading = Boolean(userId) && rolesState.uid !== userId
    return {
      session,
      user: session?.user ?? null,
      roles,
      loading: sessionLoading || rolesLoading,
      isStaff: roles.some((r) => r !== 'member'),
      hasRole: (...allowed) => roles.some((r) => allowed.includes(r)),
      refreshRoles,
    }
  }, [session, sessionLoading, userId, rolesState, refreshRoles])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
