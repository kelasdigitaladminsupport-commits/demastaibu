import { Outlet } from 'react-router-dom'
import { GlobalLoading } from '../components/GlobalLoading'
import { SeoManager } from '../features/seo/SeoManager'

/** Pembungkus seluruh rute: loading global + pengelola SEO (title/kanonik/robots/data terstruktur). */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <GlobalLoading />
      <SeoManager />
    </>
  )
}
