/**
 * Pelacak aktivitas jaringan global. Klien Supabase memakai `trackedFetch`, sehingga SEMUA permintaan
 * (query, simpan, login, logout, unggah berkas) tercatat otomatis tanpa mengubah tiap pemanggilnya.
 *  - 'read'  : GET/HEAD  -> hanya memunculkan bilah progres tipis (tidak memblokir layar)
 *  - 'write' : lainnya   -> memunculkan layar loading penuh (aksi pengguna: simpan, masuk, keluar, unggah)
 *  - 'silent': penyegaran token otomatis di latar belakang -> tidak ditampilkan
 */
export type ActivityKind = 'read' | 'write' | 'silent'
export interface ActivitySnapshot { reads: number; writes: number }

let snapshot: ActivitySnapshot = { reads: 0, writes: 0 }
const listeners = new Set<() => void>()

/** Snapshot TIDAK PERNAH diubah di tempat: selalu diganti objek baru (syarat useSyncExternalStore). */
const update = (patch: (s: ActivitySnapshot) => ActivitySnapshot) => { snapshot = patch(snapshot); listeners.forEach((l) => l()) }
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getSnapshot = (): ActivitySnapshot => snapshot

export function classify(input: RequestInfo | URL, init?: RequestInit): ActivityKind {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.includes('grant_type=refresh_token')) return 'silent'
  const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write'
}

export function beginActivity(kind: 'read' | 'write'): () => void {
  update((s) => (kind === 'read' ? { ...s, reads: s.reads + 1 } : { ...s, writes: s.writes + 1 }))
  let done = false
  return () => {
    if (done) return
    done = true
    update((s) => (kind === 'read' ? { ...s, reads: Math.max(0, s.reads - 1) } : { ...s, writes: Math.max(0, s.writes - 1) }))
  }
}

export const trackedFetch: typeof fetch = async (input, init) => {
  const kind = classify(input, init)
  if (kind === 'silent') return fetch(input, init)
  const end = beginActivity(kind)
  try { return await fetch(input, init) } finally { end() }
}
