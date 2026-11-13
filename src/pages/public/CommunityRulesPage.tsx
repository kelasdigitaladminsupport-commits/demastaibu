import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { TextContent } from '../../components/ui/TextContent'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { settingText } from '../../features/settings/helpers'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const RULES = [
  'Gunakan bahasa yang sopan dan santun. Kritik ditujukan pada gagasan atau kebijakan, bukan menyerang pribadi.',
  'Dilarang menyebarkan ujaran kebencian, SARA, pornografi, kekerasan, atau ancaman.',
  'Dilarang menyebarkan informasi pribadi orang lain tanpa izin.',
  'Dilarang menyebarkan kabar bohong, spam, atau promosi yang tidak berkaitan dengan topik.',
  'Pilih kategori diskusi yang sesuai dan hindari mengulang topik yang sudah ada.',
  'Pengelola dapat menyembunyikan konten, menutup diskusi, atau membatasi akun yang melanggar aturan.',
  'Gunakan fitur laporkan bila menemukan konten yang melanggar.',
]

export function CommunityRulesPage() {
  useDocumentTitle('Aturan Komunitas')
  const settings = useSiteSettings()
  const custom = settingText(settings.data, 'community_rules')
  return (
    <>
      <PageHeader title="Aturan Komunitas" description="Agar forum dan aspirasi tetap sehat dan bermanfaat." />
      <Container className="max-w-3xl">
        {custom ? <TextContent text={custom} /> : (
          <ol className="space-y-3">
            {RULES.map((r, i) => (
              <li key={r} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">{i + 1}</span>
                <span className="pt-0.5 text-slate-700">{r}</span>
              </li>
            ))}
          </ol>
        )}
      </Container>
    </>
  )
}
