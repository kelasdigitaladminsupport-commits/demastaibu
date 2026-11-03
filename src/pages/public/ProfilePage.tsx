import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { TextContent } from '../../components/ui/TextContent'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { settingText } from '../../features/settings/helpers'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { SITE_NAME } from '../../utils/constants'

export function ProfilePage() {
  useDocumentTitle('Profil DEMA')
  const q = useSiteSettings()
  const about = settingText(q.data, 'about')
  return (
    <>
      <PageHeader title="Profil DEMA" description={SITE_NAME} />
      <Container className="max-w-3xl">
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!about}
          emptyTitle="Profil belum diisi" emptyDescription="Pengurus belum menambahkan profil organisasi.">
          <TextContent text={about} />
        </QueryBoundary>
      </Container>
    </>
  )
}
