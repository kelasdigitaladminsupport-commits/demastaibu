import { Outlet, ScrollRestoration } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Lewati ke konten
      </a>
      <Navbar />
      <main id="konten" className="flex-1"><Outlet /></main>
      <Footer />
      <ScrollRestoration />
    </div>
  )
}
