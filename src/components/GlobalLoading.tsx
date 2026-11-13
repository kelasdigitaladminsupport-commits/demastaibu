import { useSyncExternalStore } from 'react'
import { useNavigation } from 'react-router-dom'
import { BrandLoader } from './BrandLoader'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { getSnapshot, subscribe } from '../lib/netActivity'

/**
 * Indikator loading global (dipasang sekali di RootLayout):
 *  - Bilah progres tipis di atas layar: setiap pemuatan data / pindah halaman.
 *  - Layar loading penuh bermerek: pindah halaman (termasuk memuat halaman baru) dan aksi yang mengubah data
 *    (masuk, keluar, daftar, simpan, hapus, unggah). Hanya muncul bila proses > 0,25 dtk agar aksi cepat tidak berkedip.
 */
export function GlobalLoading() {
  const nav = useNavigation()
  const { reads, writes } = useSyncExternalStore(subscribe, getSnapshot)

  const navigating = nav.state !== 'idle'
  const blocking = navigating || writes > 0
  const busy = blocking || reads > 0

  const showBar = useDelayedFlag(busy, 120, 350)
  const showOverlay = useDelayedFlag(blocking, 250, 450)

  return (
    <>
      <div className="top-progress no-print" data-active={showBar} aria-hidden>
        <div className="top-progress-bar" />
      </div>
      {showOverlay && (
        <div className="no-print fixed inset-0 z-[100] grid place-items-center bg-white/75 backdrop-blur-sm" aria-busy="true" data-testid="global-loading">
          <BrandLoader />
        </div>
      )}
    </>
  )
}
