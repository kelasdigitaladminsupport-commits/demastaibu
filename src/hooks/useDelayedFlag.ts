import { useEffect, useRef, useState } from 'react'

/**
 * Menampilkan indikator hanya bila proses berlangsung lebih dari `showAfter` ms (mencegah kedipan pada aksi cepat),
 * dan menahannya minimal `minVisible` ms setelah tampil (mencegah hilang-muncul yang mengganggu).
 */
export function useDelayedFlag(active: boolean, showAfter: number, minVisible: number): boolean {
  const [visible, setVisible] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (active && !visible) {
      const t = setTimeout(() => { shownAt.current = Date.now(); setVisible(true) }, showAfter)
      return () => clearTimeout(t)
    }
    if (!active && visible) {
      const remain = Math.max(0, minVisible - (Date.now() - shownAt.current))
      const t = setTimeout(() => setVisible(false), remain)
      return () => clearTimeout(t)
    }
  }, [active, visible, showAfter, minVisible])

  return visible
}
