import { Outlet } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><BrandMark light /></div>
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8"><Outlet /></div>
      </div>
    </div>
  )
}
