import type { ReactNode } from 'react'
import type { AppRole } from '../../types/auth'
import type { AdminBucket } from '../../services/adminStorage'

export type Row = Record<string, unknown> & { id: string }
export type FormValues = Record<string, string | boolean>

interface BaseField { name: string; label: string; hint?: string; required?: boolean }

export type FieldDef =
  | (BaseField & { type: 'text' | 'textarea' | 'date' | 'datetime' | 'number'; max?: number; rows?: number })
  | (BaseField & { type: 'slug'; from: string })
  | (BaseField & { type: 'select'; options: Array<{ value: string; label: string }> })
  | (BaseField & { type: 'checkbox' })
  | (BaseField & { type: 'relation'; table: string; labelField: string })
  | (BaseField & { type: 'image' | 'pdf'; bucket: AdminBucket; folder: string })

export interface Column { header: string; cell: (row: Row) => ReactNode }

export interface ResourceConfig {
  table: string
  title: string
  singular: string
  /** kolom yang dipilih untuk daftar */
  select: string
  searchField: string
  orderBy: { column: string; ascending: boolean }
  columns: Column[]
  fields: FieldDef[]
  defaults?: FormValues
  /** kunci cache halaman publik yang perlu disegarkan setelah perubahan */
  publicKeys: string[]
  /** kolom tambahan saat membuat data baru, mis. author_id */
  onCreate?: (ctx: { userId: string }) => Record<string, unknown>
  /** ubah payload sebelum disimpan (mis. mengisi approved_by saat laporan ditayangkan) */
  transform?: (payload: Record<string, unknown>, ctx: { userId: string }) => Record<string, unknown>
  /** kembalikan pesan galat bila tidak valid */
  validate?: (payload: Record<string, unknown>) => string | null
  /** tombol aksi tambahan per baris (mis. kelola foto galeri) */
  extraAction?: { label: string; render: (row: Row, close: () => void) => ReactNode }
  roles: AppRole[]
}
