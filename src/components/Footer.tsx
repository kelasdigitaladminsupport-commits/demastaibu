import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { SITE_NAME } from '../utils/constants'
import { useSiteSettings } from '../features/settings/useSiteSettings'
import { settingObject } from '../features/settings/helpers'
import { SOCIALS, SocialIcon, safeUrl } from '../features/branding/socials'

export function Footer() {
  const settings = useSiteSettings()
  const links = settingObject(settings.data, 'social_links')
  // Urutan mengikuti daftar platform; hanya yang terisi dan tautannya aman.
  const socials = SOCIALS.map((s) => ({ ...s, url: safeUrl(links[s.key]) })).filter((s) => s.url)

  return (
    <footer className="mt-auto bg-emerald-950 text-emerald-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <BrandMark light />
          <p className="mt-4 text-sm text-emerald-200/80">{SITE_NAME}</p>
          {socials.length > 0 && (
            <ul aria-label="Media sosial" className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.key}>
                  <a href={s.url as string} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${s.label} DEMA (buka di tab baru)`} title={s.label}
                    className="grid size-10 place-items-center rounded-full bg-white/10 text-emerald-50 transition hover:bg-gold hover:text-emerald-950">
                    <SocialIcon path={s.path} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Tautan cepat" className="text-sm">
          <h2 className="font-semibold text-gold">Tautan</h2>
          <ul className="mt-3 space-y-2">
            <li><Link className="hover:text-white" to="/berita">Berita</Link></li>
            <li><Link className="hover:text-white" to="/agenda">Agenda</Link></li>
            <li><Link className="hover:text-white" to="/aspirasi">Aspirasi</Link></li>
            <li><Link className="hover:text-white" to="/kontak">Kontak</Link></li>
          </ul>
        </nav>
        <nav aria-label="Informasi hukum" className="text-sm">
          <h2 className="font-semibold text-gold">Ketentuan</h2>
          <ul className="mt-3 space-y-2">
            <li><Link className="hover:text-white" to="/kebijakan-privasi">Kebijakan Privasi</Link></li>
            <li><Link className="hover:text-white" to="/aturan-komunitas">Aturan Komunitas</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-emerald-200/70">
        © {new Date().getFullYear()} {SITE_NAME}
      </div>
    </footer>
  )
}
