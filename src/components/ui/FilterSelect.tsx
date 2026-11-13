import { inputClass } from './Field'

interface FilterSelectProps {
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>; allLabel?: string
}

export function FilterSelect({ label, value, onChange, options, allLabel = 'Semua' }: FilterSelectProps) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{allLabel} — {label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
