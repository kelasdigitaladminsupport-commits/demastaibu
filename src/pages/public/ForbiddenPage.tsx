import { ShieldAlert } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { ButtonLink } from '../../components/ui/Button'

export function ForbiddenPage() {
  return (
    <EmptyState icon={ShieldAlert} title="Akses ditolak" description="Akun Anda tidak memiliki izin untuk membuka halaman ini.">
      <ButtonLink to="/" variant="outline">Kembali ke beranda</ButtonLink>
    </EmptyState>
  )
}
