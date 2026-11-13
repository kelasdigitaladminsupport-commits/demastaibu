import type { AppRole } from '../types/auth'

export const ROLES_SUPER: AppRole[] = ['super_admin']
export const ROLES_ADMIN: AppRole[] = ['super_admin', 'admin']
export const ROLES_EDITOR: AppRole[] = ['super_admin', 'admin', 'editor']
export const ROLES_MODERATOR: AppRole[] = ['super_admin', 'admin', 'moderator']
export const ROLES_PMB: AppRole[] = ['super_admin', 'pmb_officer']
/** Boleh mengatur periode & program studi (tanpa akses data pendaftar, kecuali ROLES_PMB). */
export const ROLES_PMB_MANAGER: AppRole[] = ['super_admin', 'admin', 'pmb_officer']
/** Semua yang boleh masuk dashboard (selain 'member'). */
export const ROLES_STAFF: AppRole[] = ['super_admin', 'admin', 'editor', 'moderator', 'pmb_officer']

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  moderator: 'Moderator',
  pmb_officer: 'Petugas PMB',
  member: 'Anggota',
}
// CATATAN: pembatasan di UI hanya untuk kenyamanan. Keamanan sebenarnya ada pada RLS di database.
