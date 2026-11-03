import { useRef, useState } from 'react'
import { FileText, ImagePlus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CoverImage } from '../../components/ui/CoverImage'
import { uploadFile, type AdminBucket, type UploadKind } from '../../services/adminStorage'
import { publicUrl } from '../../utils/storage'

interface FileFieldProps {
  kind: UploadKind
  bucket: AdminBucket
  folder: string
  value: string
  onChange: (path: string) => void
  /** dipanggil tiap berkas baru terunggah, agar bisa dibersihkan bila formulir dibatalkan */
  onUploaded: (path: string) => void
  label: string
  /** untuk logo: pertahankan transparansi dan batasi ukuran sisi terpanjang */
  logoMode?: boolean
}

export function FileField({ kind, bucket, folder, value, onChange, onUploaded, label, logoMode }: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const path = await uploadFile(file, kind, bucket, folder, logoMode ? { keepAlpha: true, maxDim: 600 } : {})
      onUploaded(path)
      onChange(path)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengunggah berkas.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const url = publicUrl(value, bucket)

  return (
    <div className="space-y-3">
      {value && kind === 'image' && <CoverImage path={value} bucket={bucket} alt={label} className={logoMode ? 'h-28 w-auto max-w-xs rounded-xl border border-slate-200 bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:16px_16px] object-contain p-2' : 'aspect-video w-full max-w-sm rounded-xl border border-slate-200'} />}
      {value && kind === 'pdf' && (
        <a href={url ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:underline">
          <FileText className="size-4" /> Lihat berkas PDF saat ini
        </a>
      )}
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" className="sr-only" id={`file-${folder}-${label}`}
          accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}
          onChange={(e) => handleFile(e.target.files?.[0])} />
        <Button variant="outline" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
          {kind === 'image' ? <ImagePlus className="size-4" /> : <Upload className="size-4" />}
          {value ? 'Ganti' : 'Unggah'} {kind === 'image' ? 'gambar' : 'PDF'}
        </Button>
        {value && !busy && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')}><Trash2 className="size-4" /> Hapus</Button>
        )}
      </div>
    </div>
  )
}
