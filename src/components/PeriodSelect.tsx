import { inputClass } from './ui/Field'

export function PeriodSelect({ periods, value, onChange }: { periods: string[]; value: string; onChange: (p: string) => void }) {
  if (periods.length <= 1) return value ? <p className="text-sm text-slate-600">Periode <strong>{value}</strong></p> : null
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Periode
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} w-auto`}>
        {periods.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </label>
  )
}
