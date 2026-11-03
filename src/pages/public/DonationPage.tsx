import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, HandHeart, Info, Lock } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { TextContent } from '../../components/ui/TextContent'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { settingText } from '../../features/settings/helpers'
import { fetchDonationReports, fetchDonationSummary, fetchPublicDonations } from '../../services/donations'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate, formatRupiah } from '../../utils/format'
import { publicUrl } from '../../utils/storage'

export function DonationPage() {
  useDocumentTitle('Donasi dan Transparansi')
  const settings = useSiteSettings()
  const enabled = settings.data?.donation_enabled === true
  const info = settingText(settings.data, 'donation_info')
  const [page, setPage] = useState(1)

  const summary = useQuery({ queryKey: ['donation-summary'], queryFn: fetchDonationSummary, enabled })
  const list = useQuery({ queryKey: ['public-donations', page], queryFn: () => fetchPublicDonations(page), enabled, placeholderData: (p) => p })
  const reports = useQuery({ queryKey: ['donation-reports'], queryFn: fetchDonationReports, enabled })

  if (settings.isLoading) return <><PageHeader title="Donasi dan Transparansi" /><Container><p className="text-sm text-slate-500">Memuat…</p></Container></>
  if (!enabled) {
    return (<><PageHeader title="Donasi dan Transparansi" /><EmptyState icon={Lock} title="Halaman ini belum diaktifkan" description="Informasi donasi akan tersedia setelah pengelola mengaktifkannya." /></>)
  }

  return (
    <>
      <PageHeader title="Donasi dan Transparansi" description="Dukungan yang diterima DEMA dan pertanggungjawabannya." />
      <Container className="max-w-4xl space-y-12">
        <section aria-labelledby="cara">
          <h2 id="cara" className="font-display text-2xl font-bold text-emerald-950">Cara berdonasi</h2>
          <div className="mt-2 h-1 w-12 rounded bg-gold" />
          <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>Website ini <strong>tidak memproses pembayaran</strong>. Pastikan Anda hanya mentransfer ke rekening atau kanal resmi yang tercantum di halaman ini, dan waspadai pihak yang mengatasnamakan DEMA.</p>
          </div>
          {info ? <TextContent text={info} className="mt-4" /> : (
            <p className="mt-4 text-slate-600">Informasi kanal donasi resmi belum tersedia. Silakan ajukan niat berdonasi melalui <Link to="/kolaborasi" className="font-semibold text-emerald-800 underline">halaman Kolaborasi</Link> atau hubungi pengurus lewat <Link to="/kontak" className="font-semibold text-emerald-800 underline">Kontak</Link>.</p>
          )}
        </section>

        <section aria-labelledby="ringkasan">
          <h2 id="ringkasan" className="font-display text-2xl font-bold text-emerald-950">Ringkasan dukungan</h2>
          <div className="mt-2 h-1 w-12 rounded bg-gold" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-3xl font-bold text-emerald-800">{summary.isLoading ? '…' : formatRupiah(summary.data?.total)}</p><p className="mt-1 text-sm text-slate-600">Total donasi terverifikasi yang dipublikasikan</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-3xl font-bold text-emerald-800">{summary.isLoading ? '…' : summary.data?.donation_count}</p><p className="mt-1 text-sm text-slate-600">Jumlah donasi</p></div>
          </div>

          <div className="mt-6">
            <QueryBoundary isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} isEmpty={(list.data?.items.length ?? 0) === 0}
              emptyIcon={HandHeart} emptyTitle="Belum ada donasi yang dipublikasikan" emptyDescription="Donasi yang telah diverifikasi akan tampil di sini. Nama donatur hanya ditampilkan bila yang bersangkutan mengizinkan.">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Donatur</th><th className="px-4 py-3">Peruntukan</th><th className="px-4 py-3 text-right">Jumlah</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.data?.items.map((d) => (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(d.donated_at)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{d.donor_display}</td>
                        <td className="px-4 py-3 text-slate-600">{[d.purpose, d.program_id ? list.data?.programs[d.program_id] : null].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-800">{formatRupiah(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={list.data?.total ?? 0} pageSize={10} onChange={setPage} />
            </QueryBoundary>
          </div>
        </section>

        <section aria-labelledby="laporan">
          <h2 id="laporan" className="font-display text-2xl font-bold text-emerald-950">Laporan pertanggungjawaban</h2>
          <div className="mt-2 h-1 w-12 rounded bg-gold" />
          <div className="mt-5">
            <QueryBoundary isLoading={reports.isLoading} error={reports.error} onRetry={() => reports.refetch()} isEmpty={(reports.data?.length ?? 0) === 0}
              emptyTitle="Belum ada laporan" emptyDescription="Laporan yang telah disetujui akan tampil di sini.">
              <ul className="space-y-4">
                {reports.data?.map((r) => {
                  const url = publicUrl(r.file_path, 'public-docs')
                  return (
                    <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{r.period_label ?? 'Laporan'}</p>
                      <h3 className="mt-1 font-semibold text-slate-900">{r.title}</h3>
                      {r.summary && <p className="mt-1 text-sm text-slate-600">{r.summary}</p>}
                      {(r.total_in != null || r.total_out != null) && (
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          {r.total_in != null && <div><dt className="text-xs text-slate-400">Pemasukan</dt><dd className="font-semibold text-emerald-800">{formatRupiah(r.total_in)}</dd></div>}
                          {r.total_out != null && <div><dt className="text-xs text-slate-400">Pengeluaran</dt><dd className="font-semibold text-slate-800">{formatRupiah(r.total_out)}</dd></div>}
                        </dl>
                      )}
                      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><Download className="size-4" /> Unduh laporan (PDF)</a>}
                    </li>
                  )
                })}
              </ul>
            </QueryBoundary>
          </div>
        </section>

        <p className="text-sm text-slate-500">Ingin mendukung program tertentu atau menjadi mitra? Kunjungi <Link to="/kolaborasi" className="font-semibold text-emerald-800 underline">Kolaborasi dan Sponsorship</Link>.</p>
      </Container>
    </>
  )
}
