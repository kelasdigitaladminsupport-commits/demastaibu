import { PageHeader } from '../../components/ui/PageHeader'
import { Container } from '../../components/ui/Container'
import { TextContent } from '../../components/ui/TextContent'
import { useSiteSettings } from '../../features/settings/useSiteSettings'
import { settingText } from '../../features/settings/helpers'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const SECTIONS: Array<[string, string[]]> = [
  ['Data yang kami kumpulkan', [
    'Akun: nama dan email yang Anda daftarkan.',
    'Aspirasi: judul, isi, dan kategori. Bila Anda memilih mengirim secara anonim, kami tidak menyimpan nama maupun kontak Anda pada data aspirasi. Lampiran hanya dapat dikirim oleh pengguna yang masuk dan tidak tersedia untuk kiriman anonim.',
    'Forum: topik dan komentar yang Anda tulis bersifat publik dan menampilkan nama Anda.',
    'Pesan kontak dan permohonan kemitraan: data yang Anda isi pada formulir.',
    'Pendaftaran calon mahasiswa (bila dibuka): data yang diisi pada formulir dan dokumen yang diunggah.',
  ]],
  ['Penggunaan data', [
    'Data digunakan untuk menjalankan layanan situs, menindaklanjuti aspirasi dan pesan, serta evaluasi organisasi. Kami tidak menjual data Anda.',
  ]],
  ['Siapa yang dapat mengakses', [
    'Aspirasi dan pesan hanya dapat dibaca pengelola yang berwenang. Catatan internal pengelola tidak dapat dilihat publik.',
    'Data pendaftar PMB hanya dapat diakses petugas PMB yang berwenang dan tidak pernah ditampilkan sebagai daftar publik.',
  ]],
  ['Keterbatasan anonimitas', [
    'Meskipun identitas tidak disimpan pada data aspirasi, penyedia infrastruktur (hosting dan basis data) dapat mencatat metadata teknis seperti alamat IP pada log mereka. Karena itu kami tidak menjanjikan anonimitas teknis mutlak.',
  ]],
  ['Penyimpanan dan keamanan', [
    'Data disimpan pada layanan basis data terkelola dengan pembatasan akses berbasis peran. Kami berupaya menjaga keamanan data, namun tidak ada sistem yang sepenuhnya bebas risiko.',
  ]],
  ['Hak Anda', [
    'Anda dapat meminta perbaikan atau penghapusan data akun Anda melalui halaman Kontak.',
  ]],
]

export function PrivacyPage() {
  useDocumentTitle('Kebijakan Privasi')
  const settings = useSiteSettings()
  const custom = settingText(settings.data, 'privacy_policy')
  return (
    <>
      <PageHeader title="Kebijakan Privasi" />
      <Container className="max-w-3xl">
        {custom ? <TextContent text={custom} /> : (
          <div className="space-y-8">
            {SECTIONS.map(([title, items]) => (
              <section key={title}>
                <h2 className="font-display text-xl font-semibold text-emerald-950">{title}</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">{items.map((t) => <li key={t}>{t}</li>)}</ul>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  )
}
