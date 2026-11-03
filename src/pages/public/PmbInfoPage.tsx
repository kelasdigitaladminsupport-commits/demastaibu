import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Lock } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoading } from '../../components/ui/Loading'
import { TextContent } from '../../components/ui/TextContent'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { fetchPmbInfo } from '../../services/pmb'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../utils/format'

export function PmbInfoPage() {
  useDocumentTitle('Informasi Calon Mahasiswa Baru')
  const settings = useSiteSettings()
  const enabled = settings.data?.pmb_enabled === true
  const info = useQuery({ queryKey: ['pmb', 'info'], queryFn: fetchPmbInfo, enabled })

  if (settings.isLoading) return <><PageHeader title="Informasi Calon Mahasiswa Baru" /><PageLoading /></>
  if (!enabled) {
    return (<><PageHeader title="Informasi Calon Mahasiswa Baru" /><EmptyState icon={Lock} title="Informasi penerimaan belum dibuka" description="Informasi dan pendaftaran akan tersedia setelah pihak kampus membukanya." /></>)
  }
  const periods = info.data?.periods ?? []
  const programs = info.data?.programs ?? []

  return (
    <>
      <PageHeader title="Informasi Calon Mahasiswa Baru" description="Periode, program studi, persyaratan, dan jadwal penerimaan.">
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink to="/pmb/daftar" variant="gold">Daftar sekarang</ButtonLink>
          <ButtonLink to="/pmb/status" variant="outline" className="border-white text-white hover:bg-white/10">Cek status pendaftaran</ButtonLink>
        </div>
      </PageHeader>
      <Container className="max-w-4xl space-y-12">
        {info.isLoading ? <PageLoading /> : info.error ? (
          <EmptyState title="Data gagal dimuat" description="Periksa koneksi internet Anda, lalu coba lagi." />
        ) : periods.length === 0 && programs.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Informasi belum tersedia" description="Periode dan program studi belum diumumkan oleh pihak kampus." />
        ) : (
          <>
            {periods.map((p) => (
              <section key={p.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Tahun akademik {p.academic_year}</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-emerald-950">{p.name}</h2>
                <p className="mt-2 text-sm text-slate-600">Periode pendaftaran: <strong>{formatDate(p.start_date)} – {formatDate(p.end_date)}</strong></p>
                {p.description && <TextContent text={p.description} className="mt-4" />}
                {p.requirements && (<><h3 className="mt-6 font-semibold text-emerald-900">Persyaratan</h3><TextContent text={p.requirements} className="mt-2" /></>)}
                {p.schedule && (<><h3 className="mt-6 font-semibold text-emerald-900">Jadwal</h3><TextContent text={p.schedule} className="mt-2" /></>)}
              </section>
            ))}
            {programs.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-bold text-emerald-950">Program studi</h2>
                <div className="mt-2 h-1 w-12 rounded bg-gold" />
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {programs.map((s) => (
                    <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      {s.level && <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{s.level}</p>}
                      {s.description && <p className="mt-2 text-sm text-slate-600">{s.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        <p className="text-sm text-slate-500">Data pendaftar bersifat privat dan hanya dapat diakses petugas PMB yang berwenang. Lihat <Link to="/kebijakan-privasi" className="font-semibold text-emerald-800 underline">Kebijakan Privasi</Link>.</p>
      </Container>
    </>
  )
}
