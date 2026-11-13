import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AppRole } from '../../types/auth'

export interface AuthState {
  session: Session | null
  user: User | null
  roles: AppRole[]
  /** true selama sesi atau role masih dimuat */
  loading: boolean
  isStaff: boolean
  hasRole: (...allowed: AppRole[]) => boolean
  refreshRoles: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
