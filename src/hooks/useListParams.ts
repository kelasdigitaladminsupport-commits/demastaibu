import { useSearchParams } from 'react-router-dom'

/** Status daftar (halaman, pencarian, filter) disimpan di URL agar bisa dibagikan dan tahan refresh. */
export function useListParams() {
  const [sp, setSp] = useSearchParams()
  const page = Math.max(1, Number(sp.get('hal')) || 1)
  const q = sp.get('q') ?? ''
  const get = (k: string) => sp.get(k) ?? ''

  function set(patch: Record<string, string | number | null>) {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || (k === 'hal' && Number(v) <= 1)) next.delete(k)
      else next.set(k, String(v))
    }
    if (!('hal' in patch)) next.delete('hal') // ganti filter/pencarian => kembali ke halaman 1
    setSp(next, { replace: true })
  }
  return { page, q, get, set }
}
