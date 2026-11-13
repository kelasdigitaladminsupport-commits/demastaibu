import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Container } from '../../components/ui/Container'
import { Button, ButtonLink } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/Loading'
import { LoginPrompt } from '../../features/forum/LoginPrompt'
import { APPLICANT_STATUS_LABEL, GENDER_LABEL } from '../../features/pmb/constants'
import { NotFoundPage } from './NotFoundPage'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useBranding } from '../../features/branding/useBranding'
import { fetchMyApplication } from '../../services/pmb'
import { formatDate, formatDateTime } from '../../utils/format'
import { SITE_NAME } from '../../utils/constants'

export function PmbReceiptPage() {
  const { id = '' } = useParams()
  const { user, loading } = useAuth()
  const q = useQuery({ queryKey: ['pmb', 'app', id], queryFn: () => fetchMyApplication(id), enabled: Boolean(user) })
  const a = q.data
  const { logoUrl } = useBranding()
  useDocumentTitle(a ? `Bukti Pendaftaran ${a.registration_no}` : 'Bukti Pendaftaran')

  if (loading || q.isLoading) return <PageLoading />
  if (!user) return <Container className="max-w-2xl"><LoginPrompt text="Masuk untuk mencetak bukti pendaftaran." /></Container>
  if (!a) return <NotFoundPage />

  const rows: Array<[string, string]> = [
    ['Nomor pendaftaran', a.registration_no],
    ['Nama lengkap', a.full_name],
    ['Program studi', a.program?.name ?? '—'],
    ['Periode', `${a.period?.name ?? '—'} (${a.period?.academic_year ?? '—'})`],
    ['Tempat, tanggal lahir', [a.birth_place, a.birth_date ? formatDate(a.birth_date) : null].filter(Boolean).join(', ') || '—'],
    ['Jenis kelamin', a.gender ? GENDER_LABEL[a.gender] : '—'],
    ['Email', a.email],
    ['Telepon', a.phone ?? '—'],
    ['Asal sekolah', a.previous_school ?? '—'],
    ['Tanggal pendaftaran', formatDateTime(a.created_at)],
    ['Status saat dicetak', APPLICANT_STATUS_LABEL[a.status] ?? a.status],
  ]

  return (
    <Container className="max-w-2xl">
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <Button onClick={() => window.print()}><Printer className="size-4" /> Cetak / simpan PDF</Button>
        <ButtonLink to={`/pmb/pendaftaran/${a.id}`} variant="ghost">Kembali</ButtonLink>
      </div>
      <article className="print-area rounded-2xl border border-slate-300 bg-white p-8">
        <header className="border-b-2 border-emerald-800 pb-4 text-center">
          {logoUrl && <img src={logoUrl} alt="Logo" className="mx-auto mb-2 h-16 w-auto object-contain" />}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Bukti Pendaftaran</p>
          <h1 className="mt-1 font-display text-xl font-bold text-emerald-950">Penerimaan Mahasiswa Baru</h1>
          <p className="text-sm text-slate-600">{SITE_NAME}</p>
        </header>
        <dl className="mt-6 divide-y divide-slate-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[11rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className={`font-medium text-slate-900 ${k === 'Nomor pendaftaran' ? 'font-mono text-base' : ''}`}>{v}</dd></div>
          ))}
        </dl>
        <p className="mt-6 text-xs leading-relaxed text-slate-500">Dokumen ini merupakan bukti bahwa data pendaftaran telah diterima sistem. Dokumen ini bukan pernyataan diterima sebagai mahasiswa. Keputusan penerimaan ditetapkan oleh pihak kampus. Simpan nomor pendaftaran untuk keperluan konfirmasi.</p>
        <p className="mt-4 text-right text-xs text-slate-400">Dicetak {formatDateTime(new Date().toISOString())}</p>
      </article>
    </Container>
  )
}
