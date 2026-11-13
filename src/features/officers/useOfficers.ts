import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOfficers } from '../../services/content'
import { useListParams } from '../../hooks/useListParams'
import type { Officer } from '../../types/content'

/** Pengurus + pilihan periode (disimpan di URL ?periode=). Default: periode terbaru. */
export function useOfficersByPeriod() {
  const query = useQuery({ queryKey: ['officers'], queryFn: fetchOfficers })
  const { get, set } = useListParams()

  const periods = useMemo(
    () => Array.from(new Set((query.data ?? []).map((o) => o.period))).sort().reverse(),
    [query.data],
  )
  const period = periods.includes(get('periode')) ? get('periode') : (periods[0] ?? '')
  const officers: Officer[] = useMemo(() => (query.data ?? []).filter((o) => o.period === period), [query.data, period])

  return { query, periods, period, officers, setPeriod: (p: string) => set({ periode: p }) }
}
