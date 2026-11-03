import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { inputClass } from './Field'

interface SearchBarProps { value: string; onSearch: (q: string) => void; placeholder?: string }

export function SearchBar({ value, onSearch, placeholder = 'Cari…' }: SearchBarProps) {
  const [text, setText] = useState(value)
  const debounced = useDebounce(text, 400)

  useEffect(() => { if (debounced.trim() !== value) onSearch(debounced.trim()) }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
        aria-label={placeholder} className={`${inputClass} pl-9`} />
    </div>
  )
}
