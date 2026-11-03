import { hasServiceKeyLeak } from '../lib/supabase'

export function ConfigMissing() {
  return (
    <div className="grid min-h-screen place-items-center bg-amber-50 p-6">
      <div className="max-w-xl rounded-2xl border border-amber-300 bg-white p-8 shadow">
        <h1 className="font-display text-2xl font-bold text-amber-800">
          {hasServiceKeyLeak ? 'Kunci rahasia terdeteksi di frontend' : 'Konfigurasi Supabase belum diisi'}
        </h1>
        {hasServiceKeyLeak ? (
          <p className="mt-3 text-sm text-slate-700">
            Variabel <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> berisi kunci <strong>service_role / secret</strong>.
            Kunci ini memberi akses penuh ke database dan TIDAK boleh ada di frontend. Ganti dengan kunci
            <em> publishable / anon</em>, lalu reset (rotate) kunci rahasia yang terlanjur dipakai di Dashboard Supabase.
          </p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Salin <code>.env.example</code> menjadi <code>.env.local</code>.</li>
            <li>Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (Supabase → Project Settings → API).</li>
            <li>Hentikan dan jalankan ulang <code>npm run dev</code>.</li>
          </ol>
        )}
      </div>
    </div>
  )
}
