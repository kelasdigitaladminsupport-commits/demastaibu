import { Avatar } from './ui/Avatar'
import type { Officer } from '../types/content'

export function OfficerCard({ officer, highlight = false }: { officer: Officer; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl border bg-white p-5 text-center ${highlight ? 'border-gold shadow-sm' : 'border-slate-200'}`}>
      <Avatar path={officer.photo_path} name={officer.full_name} className={highlight ? 'size-24 text-2xl' : 'size-20 text-xl'} />
      <h3 className="mt-3 font-semibold text-slate-900">{officer.full_name}</h3>
      <p className="text-sm font-medium text-emerald-800">{officer.position.title}</p>
      {officer.department && <p className="text-xs text-slate-500">{officer.department.name}</p>}
      {officer.duty_description && <p className="mt-2 line-clamp-3 text-xs text-slate-600">{officer.duty_description}</p>}
    </div>
  )
}
