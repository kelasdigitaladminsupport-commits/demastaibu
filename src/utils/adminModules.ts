import type { AppRole } from '../types/auth'
import {
  ROLES_ADMIN, ROLES_EDITOR, ROLES_MODERATOR, ROLES_PMB_MANAGER, ROLES_SUPER,
} from './roles'

export interface AdminModule {
  path: string
  label: string
  roles: AppRole[]
  stage: string   // tahap pengerjaan modul ini (mis. '5B')
}

// Satu sumber kebenaran untuk menu sidebar DAN routing/proteksi halaman admin.
export const ADMIN_MODULES: AdminModule[] = [
  { path: 'profil',      label: 'Profil, Visi & Misi',   roles: ROLES_ADMIN,     stage: '5B' },
  { path: 'bidang',      label: 'Bidang',                roles: ROLES_ADMIN,     stage: '5B' },
  { path: 'jabatan',     label: 'Jabatan',               roles: ROLES_ADMIN,     stage: '5B' },
  { path: 'pengurus',    label: 'Pengurus',              roles: ROLES_ADMIN,     stage: '5B' },
  { path: 'kategori-berita', label: 'Kategori Berita',    roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'berita',      label: 'Berita',                roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'agenda',      label: 'Agenda',                roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'program',     label: 'Program Kerja',         roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'galeri',      label: 'Galeri',                roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'pengabdian', label: 'Pengabdian Masyarakat', roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'laporan',     label: 'Laporan',               roles: ROLES_EDITOR,    stage: '5A' },
  { path: 'aspirasi',    label: 'Aspirasi',              roles: ROLES_MODERATOR, stage: '6' },
  { path: 'forum',       label: 'Forum & Moderasi',      roles: ROLES_MODERATOR, stage: '6' },
  { path: 'sponsorship', label: 'Sponsorship & Mitra',   roles: ROLES_ADMIN,     stage: '7' },
  { path: 'donasi',      label: 'Donasi',                roles: ROLES_ADMIN,     stage: '7' },
  { path: 'kontak',      label: 'Pesan Kontak',          roles: ROLES_ADMIN,     stage: '7' },
  { path: 'pmb',         label: 'PMB',                   roles: ROLES_PMB_MANAGER, stage: '8' },
  { path: 'pengguna',    label: 'Pengguna & Role',       roles: ROLES_SUPER,     stage: '5B' },
  { path: 'pengaturan',  label: 'Pengaturan Website',    roles: ROLES_ADMIN,     stage: '5B' },
  { path: 'log',         label: 'Log Aktivitas',         roles: ROLES_ADMIN,     stage: '5B' },
]
