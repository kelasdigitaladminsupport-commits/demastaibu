import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { PageLoading } from '../components/ui/Loading'
import { PublicLayout } from '../layouts/PublicLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { RootLayout } from '../layouts/RootLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { HomePage } from '../pages/public/HomePage'
import { ComingSoonPage } from '../pages/public/ComingSoonPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { DashboardPage } from '../pages/admin/DashboardPage'
import { AdminModulePage } from '../pages/admin/AdminModulePage'
import { ADMIN_MODULES } from '../utils/adminModules'
import { ROLES_STAFF } from '../utils/roles'

// Halaman yang belum dibangun: [path, judul, tahap pembangunan]
const PLACEHOLDER_PAGES: Array<[string, string, number]> = [
]

// Pemuatan malas: tiap halaman menjadi berkas JS terpisah agar muatan awal ringan.
function lazyPage<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K): RouteObject['lazy'] {
  return async () => ({ Component: (await loader())[name] })
}

// Modul admin: pemuatan malas agar kode dashboard tidak membebani pengunjung publik.
const CUSTOM_ADMIN: Record<string, RouteObject['lazy']> = {
  profil: lazyPage(() => import('../pages/admin/ProfileSettingsPage'), 'ProfileSettingsPage'),
  pengaturan: lazyPage(() => import('../pages/admin/SiteSettingsPage'), 'SiteSettingsPage'),
  pengguna: lazyPage(() => import('../pages/admin/UsersPage'), 'UsersPage'),
  log: lazyPage(() => import('../pages/admin/AuditLogPage'), 'AuditLogPage'),
  aspirasi: lazyPage(() => import('../pages/admin/AspirationsAdminPage'), 'AspirationsAdminPage'),
  forum: lazyPage(() => import('../pages/admin/ForumAdminPage'), 'ForumAdminPage'),
  sponsorship: lazyPage(() => import('../pages/admin/PartnershipsAdminPage'), 'PartnershipsAdminPage'),
  donasi: lazyPage(() => import('../pages/admin/DonationsAdminPage'), 'DonationsAdminPage'),
  kontak: lazyPage(() => import('../pages/admin/ContactAdminPage'), 'ContactAdminPage'),
  pmb: lazyPage(() => import('../pages/admin/PmbAdminPage'), 'PmbAdminPage'),
}
const RESOURCE_KEYS = new Set(['kategori-berita', 'berita', 'agenda', 'program', 'galeri', 'pengabdian', 'laporan', 'bidang', 'jabatan', 'pengurus'])

function resourceRoute(key: string): RouteObject['lazy'] {
  return async () => {
    const [{ ResourceManager }, { RESOURCES }] = await Promise.all([
      import('../features/admin/ResourceManager'),
      import('../features/admin/resources'),
    ])
    return { Component: () => <ResourceManager key={key} config={RESOURCES[key]} /> }
  }
}

const publicChildren: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'profil', lazy: lazyPage(() => import('../pages/public/ProfilePage'), 'ProfilePage') },
  { path: 'visi-misi', lazy: lazyPage(() => import('../pages/public/VisionMissionPage'), 'VisionMissionPage') },
  { path: 'struktur', lazy: lazyPage(() => import('../pages/public/StructurePage'), 'StructurePage') },
  { path: 'bidang', lazy: lazyPage(() => import('../pages/public/DepartmentsPage'), 'DepartmentsPage') },
  { path: 'berita', lazy: lazyPage(() => import('../pages/public/NewsListPage'), 'NewsListPage') },
  { path: 'berita/:slug', lazy: lazyPage(() => import('../pages/public/NewsDetailPage'), 'NewsDetailPage') },
  { path: 'agenda', lazy: lazyPage(() => import('../pages/public/EventsPage'), 'EventsPage') },
  { path: 'agenda/:slug', lazy: lazyPage(() => import('../pages/public/EventDetailPage'), 'EventDetailPage') },
  { path: 'program-kerja', lazy: lazyPage(() => import('../pages/public/ProgramsPage'), 'ProgramsPage') },
  { path: 'galeri', lazy: lazyPage(() => import('../pages/public/GalleryListPage'), 'GalleryListPage') },
  { path: 'galeri/:id', lazy: lazyPage(() => import('../pages/public/GalleryDetailPage'), 'GalleryDetailPage') },
  { path: 'pengabdian', lazy: lazyPage(() => import('../pages/public/CommunityPage'), 'CommunityPage') },
  { path: 'laporan', lazy: lazyPage(() => import('../pages/public/ReportsPage'), 'ReportsPage') },
  { path: 'aspirasi', lazy: lazyPage(() => import('../pages/public/AspirationPage'), 'AspirationPage') },
  { path: 'forum', lazy: lazyPage(() => import('../pages/public/ForumPage'), 'ForumPage') },
  { path: 'forum/baru', lazy: lazyPage(() => import('../pages/public/ForumNewTopicPage'), 'ForumNewTopicPage') },
  { path: 'forum/topik/:id', lazy: lazyPage(() => import('../pages/public/ForumTopicPage'), 'ForumTopicPage') },
  { path: 'kolaborasi', lazy: lazyPage(() => import('../pages/public/PartnershipPage'), 'PartnershipPage') },
  { path: 'donasi', lazy: lazyPage(() => import('../pages/public/DonationPage'), 'DonationPage') },
  { path: 'pmb', lazy: lazyPage(() => import('../pages/public/PmbInfoPage'), 'PmbInfoPage') },
  { path: 'pmb/daftar', lazy: lazyPage(() => import('../pages/public/PmbRegisterPage'), 'PmbRegisterPage') },
  { path: 'pmb/status', lazy: lazyPage(() => import('../pages/public/PmbStatusPage'), 'PmbStatusPage') },
  { path: 'pmb/pendaftaran/:id', lazy: lazyPage(() => import('../pages/public/PmbApplicationPage'), 'PmbApplicationPage') },
  { path: 'pmb/bukti/:id', lazy: lazyPage(() => import('../pages/public/PmbReceiptPage'), 'PmbReceiptPage') },
  { path: 'kontak', lazy: lazyPage(() => import('../pages/public/ContactPage'), 'ContactPage') },
  { path: 'kebijakan-privasi', lazy: lazyPage(() => import('../pages/public/PrivacyPage'), 'PrivacyPage') },
  { path: 'aturan-komunitas', lazy: lazyPage(() => import('../pages/public/CommunityRulesPage'), 'CommunityRulesPage') },
  ...PLACEHOLDER_PAGES.map(([path, title, stage]): RouteObject => ({
    path,
    element: <ComingSoonPage title={title} stage={stage} />,
  })),
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter([
  {
    // RootLayout membungkus semua rute: loading global + SEO
    element: <RootLayout />,
    hydrateFallbackElement: <PageLoading />,
    children: [
  { element: <PublicLayout />, children: publicChildren },
  {
    element: <AuthLayout />,
    children: [
      { path: 'masuk', element: <LoginPage /> },
      { path: 'daftar', element: <RegisterPage /> },
      { path: 'lupa-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    // Seluruh /admin: wajib login + minimal satu role staf
    element: <ProtectedRoute roles={ROLES_STAFF} />,
    children: [
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          // Tiap modul dilindungi role-nya sendiri (sumber: utils/adminModules.ts)
          ...ADMIN_MODULES.map((m): RouteObject => ({
            element: <ProtectedRoute roles={m.roles} />,
            children: [
              CUSTOM_ADMIN[m.path]
                ? { path: m.path, lazy: CUSTOM_ADMIN[m.path] }
                : RESOURCE_KEYS.has(m.path)
                  ? { path: m.path, lazy: resourceRoute(m.path) }
                  : { path: m.path, element: <AdminModulePage module={m} /> },
            ],
          })),
        ],
      },
    ],
  },
    ],
  },
])
