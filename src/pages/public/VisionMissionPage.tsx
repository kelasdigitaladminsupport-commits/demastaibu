import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { TextContent } from '../../components/ui/TextContent'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { settingList, settingText } from '../../features/settings/helpers'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function VisionMissionPage() {
  useDocumentTitle('Visi dan Misi')
  const q = useSiteSettings()
  const vision = settingText(q.data, 'vision')
  const mission = settingList(q.data, 'mission')
  return (
    <>
      <PageHeader title="Visi dan Misi" />
      <Container className="max-w-3xl space-y-10">
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!vision && mission.length === 0}
          emptyTitle="Visi dan misi belum diisi" emptyDescription="Pengurus belum menambahkan visi dan misi.">
          {vision && (
            <section>
              <h2 className="font-display text-2xl font-bold text-emerald-950">Visi</h2>
              <div className="mt-2 h-1 w-12 rounded bg-gold" />
              <TextContent text={vision} className="mt-4 text-lg" />
            </section>
          )}
          {mission.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold text-emerald-950">Misi</h2>
              <div className="mt-2 h-1 w-12 rounded bg-gold" />
              <ol className="mt-4 space-y-3">
                {mission.map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">{i + 1}</span>
                    <span className="pt-0.5 text-slate-700">{m}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </QueryBoundary>
      </Container>
    </>
  )
}
