import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { PageLoading } from '../../components/ui/Loading'
import { FileField } from './FileField'
import { supabase } from '../../lib/supabase'
import { removeFiles } from '../../services/adminStorage'
import { describeDbError } from '../../services/adminErrors'
import { fromLocalInput, toLocalInput } from '../../utils/datetime'
import { SLUG_PATTERN, slugify } from '../../utils/slug'
import type { FieldDef, FormValues, ResourceConfig, Row } from './types'

function RelationSelect({ field, value, onChange, id }: { field: Extract<FieldDef, { type: 'relation' }>; value: string; onChange: (v: string) => void; id: string }) {
  const q = useQuery({
    queryKey: ['admin-rel', field.table, field.labelField],
    queryFn: async () => {
      const { data, error } = await supabase.from(field.table).select(`id, ${field.labelField}`).order(field.labelField)
      if (error) throw error
      return (data ?? []) as unknown as Array<Record<string, string>>
    },
  })
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} disabled={q.isLoading}>
      <option value="">{field.required ? '— Pilih —' : '— Tidak ada —'}</option>
      {q.data?.map((o) => <option key={o.id} value={o.id}>{o[field.labelField]}</option>)}
    </select>
  )
}

/** Baris database -> nilai formulir (semua string/boolean). */
function toFormValues(fields: FieldDef[], row: Row | null, defaults: FormValues): FormValues {
  const out: FormValues = {}
  for (const f of fields) {
    const raw = row ? row[f.name] : undefined
    if (f.type === 'checkbox') out[f.name] = row ? Boolean(raw) : Boolean(defaults[f.name])
    else if (f.type === 'datetime') out[f.name] = row ? toLocalInput(raw as string | null) : String(defaults[f.name] ?? '')
    else out[f.name] = row ? (raw == null ? '' : String(raw)) : String(defaults[f.name] ?? '')
  }
  return out
}

/** Nilai formulir -> payload database. */
function toPayload(fields: FieldDef[], v: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const raw = v[f.name]
    if (f.type === 'checkbox') out[f.name] = Boolean(raw)
    else if (f.type === 'datetime') out[f.name] = fromLocalInput(String(raw))
    else if (f.type === 'number') out[f.name] = String(raw).trim() === '' ? null : Number(raw)
    else {
      const s = String(raw ?? '').trim()
      out[f.name] = s === '' && !f.required ? null : s
    }
  }
  return out
}

interface ResourceFormProps {
  config: ResourceConfig
  id: string | null
  userId: string
  onDone: () => void
  onCancel: () => void
}

export function ResourceForm({ config, id, userId, onDone, onCancel }: ResourceFormProps) {
  const isNew = id === null
  const [saving, setSaving] = useState(false)
  const uploads = useRef<string[]>([])
  const slugTouched = useRef(false)

  const existing = useQuery({
    queryKey: ['admin-row', config.table, id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from(config.table).select('*').eq('id', id as string).single()
      if (error) throw error
      return data as unknown as Row
    },
  })

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: toFormValues(config.fields, null, config.defaults ?? {}),
  })

  useEffect(() => {
    if (existing.data) { reset(toFormValues(config.fields, existing.data, config.defaults ?? {})); slugTouched.current = true }
  }, [existing.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Slug otomatis dari judul/nama selama pengguna belum mengubahnya sendiri
  const slugField = config.fields.find((f): f is Extract<FieldDef, { type: 'slug' }> => f.type === 'slug')
  const sourceValue = slugField ? String(watch(slugField.from) ?? '') : ''
  useEffect(() => {
    if (slugField && isNew && !slugTouched.current) setValue(slugField.name, slugify(sourceValue), { shouldValidate: false })
  }, [sourceValue]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Bersihkan unggahan yang tidak jadi dipakai. */
  async function cleanupUnused(keep: Array<string | null>) {
    const unused = uploads.current.filter((p) => !keep.includes(p))
    for (const f of config.fields) {
      if (f.type === 'image' || f.type === 'pdf') await removeFiles(f.bucket, unused)
    }
    uploads.current = []
  }

  async function handleCancel() {
    await cleanupUnused([])
    onCancel()
  }

  async function onSubmit(values: FormValues) {
    const payload = toPayload(config.fields, values)
    const problem = config.validate?.(payload)
    if (problem) { toast.error(problem); return }
    const toSave = config.transform ? config.transform(payload, { userId }) : payload

    setSaving(true)
    try {
      const fileFields = config.fields.filter((f): f is Extract<FieldDef, { type: 'image' | 'pdf' }> => f.type === 'image' || f.type === 'pdf')
      if (isNew) {
        const { error } = await supabase.from(config.table).insert({ ...toSave, ...(config.onCreate?.({ userId }) ?? {}) })
        if (error) throw error
      } else {
        const { error } = await supabase.from(config.table).update(toSave).eq('id', id as string)
        if (error) throw error
        // hapus berkas lama yang telah diganti/dihapus
        for (const f of fileFields) {
          const old = existing.data?.[f.name] as string | null | undefined
          if (old && old !== payload[f.name]) await removeFiles(f.bucket, [old])
        }
      }
      await cleanupUnused(fileFields.map((f) => payload[f.name] as string | null))
      toast.success(isNew ? `${config.singular} berhasil ditambahkan.` : 'Perubahan disimpan.')
      onDone()
    } catch (e) {
      toast.error(describeDbError(e))
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && existing.isLoading) return <PageLoading />
  if (!isNew && existing.error) return <p className="text-sm text-red-600">Data tidak dapat dimuat.</p>

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleCancel} className="rounded-md p-2 hover:bg-slate-100" aria-label="Kembali"><ArrowLeft className="size-5" /></button>
        <h1 className="font-display text-2xl font-bold text-emerald-950">{isNew ? `Tambah ${config.singular}` : `Ubah ${config.singular}`}</h1>
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        {config.fields.map((f) => {
          const err = errors[f.name]?.message as string | undefined
          const id = `f-${f.name}`
          const required = f.required ? 'Wajib diisi' : false

          if (f.type === 'checkbox') {
            return (
              <label key={f.name} className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 size-4 rounded border-slate-300 text-emerald-700" {...register(f.name)} />
                <span><span className="text-sm font-medium text-slate-800">{f.label}</span>
                  {f.hint && <span className="block text-xs text-slate-500">{f.hint}</span>}</span>
              </label>
            )
          }

          return (
            <Field key={f.name} label={f.label + (f.required ? ' *' : '')} htmlFor={id} error={err} hint={f.hint}>
              {(f.type === 'text' || f.type === 'date' || f.type === 'number') && (
                <input id={id} type={f.type === 'text' ? 'text' : f.type} className={inputClass}
                  {...register(f.name, { required, maxLength: f.max ? { value: f.max, message: `Maksimal ${f.max} karakter` } : undefined })} />
              )}
              {f.type === 'datetime' && (
                <input id={id} type="datetime-local" className={inputClass} {...register(f.name, { required })} />
              )}
              {f.type === 'textarea' && (
                <textarea id={id} rows={f.rows ?? 4} className={inputClass}
                  {...register(f.name, { required, maxLength: f.max ? { value: f.max, message: `Maksimal ${f.max} karakter` } : undefined })} />
              )}
              {f.type === 'slug' && (
                <input id={id} className={inputClass} {...register(f.name, {
                  required: 'Wajib diisi',
                  pattern: { value: SLUG_PATTERN, message: 'Hanya huruf kecil, angka, dan tanda hubung' },
                  onChange: () => { slugTouched.current = true },
                })} />
              )}
              {f.type === 'select' && (
                <select id={id} className={inputClass} {...register(f.name, { required })}>
                  {!f.required && <option value="">—</option>}
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {f.type === 'relation' && (
                <Controller name={f.name} control={control} rules={{ required }}
                  render={({ field }) => <RelationSelect id={id} field={f} value={String(field.value ?? '')} onChange={field.onChange} />} />
              )}
              {(f.type === 'image' || f.type === 'pdf') && (
                <Controller name={f.name} control={control}
                  render={({ field }) => (
                    <FileField kind={f.type as 'image' | 'pdf'} bucket={f.bucket} folder={f.folder} label={f.label}
                      value={String(field.value ?? '')} onChange={field.onChange}
                      onUploaded={(p) => uploads.current.push(p)} />
                  )} />
              )}
            </Field>
          )
        })}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={handleCancel} disabled={saving}>Batal</Button>
        <Button type="submit" loading={saving}>Simpan</Button>
      </div>
    </form>
  )
}
