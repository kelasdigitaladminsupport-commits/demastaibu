import { supabase } from '../lib/supabase'

export interface DonationSummary { total: number; donation_count: number }
export interface PublicDonation { id: string; donor_display: string; amount: number; purpose: string | null; program_id: string | null; donated_at: string }
export interface DonationReport {
  id: string; title: string; period_label: string | null; summary: string | null
  total_in: number | null; total_out: number | null; file_path: string | null; approved_at: string | null
}

export async function fetchDonationSummary(): Promise<DonationSummary> {
  const { data, error } = await supabase.from('public_donation_summary').select('total, donation_count').maybeSingle()
  if (error) throw error
  const d = data as { total: number | string; donation_count: number } | null
  return { total: Number(d?.total ?? 0), donation_count: d?.donation_count ?? 0 }
}

export async function fetchPublicDonations(page: number, size = 10) {
  const { data, error, count } = await supabase.from('public_donations')
    .select('id, donor_display, amount, purpose, program_id, donated_at', { count: 'exact' })
    .order('donated_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (error) throw error
  const items = (data ?? []) as unknown as PublicDonation[]
  const ids = Array.from(new Set(items.map((d) => d.program_id).filter((x): x is string => Boolean(x))))
  const programs: Record<string, string> = {}
  if (ids.length) {
    const r = await supabase.from('programs').select('id, title').in('id', ids)
    for (const p of (r.data ?? []) as Array<{ id: string; title: string }>) programs[p.id] = p.title
  }
  return { items, total: count ?? 0, programs }
}

export async function fetchDonationReports(): Promise<DonationReport[]> {
  const { data, error } = await supabase.from('donation_reports')
    .select('id, title, period_label, summary, total_in, total_out, file_path, approved_at')
    .eq('is_published', true).not('approved_by', 'is', null).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as DonationReport[]
}
