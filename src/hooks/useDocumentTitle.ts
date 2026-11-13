import { useEffect } from 'react'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_SHORT } from '../utils/constants'
import { setMeta, truncate } from '../features/seo/head'

/** Judul tab + judul pratinjau tautan (Open Graph/Twitter). Tanpa argumen = judul beranda. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE_SHORT}` : DEFAULT_TITLE
    document.title = full
    setMeta('property', 'og:title', full)
    setMeta('name', 'twitter:title', full)
  }, [title])
}

/** Deskripsi halaman untuk hasil pencarian Google dan pratinjau tautan. Dikembalikan ke bawaan saat halaman ditinggalkan. */
export function useSeoDescription(description?: string | null) {
  useEffect(() => {
    const d = description ? truncate(description) : DEFAULT_DESCRIPTION
    setMeta('name', 'description', d)
    setMeta('property', 'og:description', d)
    setMeta('name', 'twitter:description', d)
    return () => {
      setMeta('name', 'description', DEFAULT_DESCRIPTION)
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION)
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION)
    }
  }, [description])
}
