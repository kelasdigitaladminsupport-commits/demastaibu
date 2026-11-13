import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { GlobalLoading } from '../components/GlobalLoading'
import { SeoManager } from '../features/seo/SeoManager'
import { supabase } from '../lib/supabase'

/** Pembungkus seluruh rute: loading global + pengelola SEO (title/kanonik/robots/data terstruktur). */
export function RootLayout() {
  const navigate = useNavigate()

  // Tautan pemulihan kata sandi dari email: ke mana pun Supabase mengarahkannya (mis. beranda bila /reset-password
  // belum terdaftar di Redirect URLs), pengguna tetap dibawa ke formulir kata sandi baru.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true })
    })
    return () => data.subscription.unsubscribe()
  }, [navigate])

  return (
    <>
      <Outlet />
      <GlobalLoading />
      <SeoManager />
    </>
  )
}
