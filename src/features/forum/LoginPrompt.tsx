import { Link, useLocation } from 'react-router-dom'

export function LoginPrompt({ text }: { text: string }) {
  const { pathname } = useLocation()
  return (
    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
      {text} <Link to="/masuk" state={{ from: pathname }} className="font-semibold text-emerald-800 underline">Masuk</Link> atau{' '}
      <Link to="/daftar" className="font-semibold text-emerald-800 underline">daftar</Link>.
    </p>
  )
}
