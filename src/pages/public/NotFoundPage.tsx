import { SearchX } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { ButtonLink } from '../../components/ui/Button'

export function NotFoundPage() {
  return (
    <EmptyState icon={SearchX} title="Halaman tidak ditemukan (404)" description="Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.">
      <ButtonLink to="/">Kembali ke beranda</ButtonLink>
    </EmptyState>
  )
}
