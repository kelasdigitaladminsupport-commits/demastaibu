import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Loading'
import { deleteDocument, fetchDocuments, signedDocUrl, uploadDocument, type ApplicantDoc } from '../../services/pmb'
import { formatDateTime } from '../../utils/format'

const kb = (n: number | null) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : '')

export function DocumentsManager({ applicantId, userId, editable }: { applicantId: string; userId: string; editable: boolean }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const docs = useQuery({ queryKey: ['pmb-docs', applicantId], queryFn: () => fetchDocuments(applicantId) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['pmb-docs', applicantId] })

  const upload = useMutation({
    mutationFn: () => uploadDocument({ userId, applicantId, docType, file: file as File }),
    onSuccess: () => { toast.success('Dokumen diunggah.'); setFile(null); setDocType(''); if (fileRef.current) fileRef.current.value = ''; refresh() },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal mengunggah.'),
  })
  const remove = useMutation({
    mutationFn: (d: ApplicantDoc) => deleteDocument(d),
    onSuccess: () => { toast.success('Dokumen dihapus.'); refresh() },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus.'),
  })
  async function open(d: ApplicantDoc) {
    const url = await signedDocUrl(d.file_path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer'); else toast.error('Tidak dapat membuka dokumen.')
  }

  return (
    <div className="space-y-4">
      {docs.isLoading ? <Spinner /> : (docs.data?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Belum ada dokumen yang diunggah.</p> : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {docs.data?.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <FileText className="size-5 shrink-0 text-emerald-700" aria-hidden />
              <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{d.doc_type}</p>
                <p className="truncate text-xs text-slate-500">{d.original_name} · {kb(d.size_bytes)} · {formatDateTime(d.created_at)}</p></div>
              <Button variant="outline" size="sm" onClick={() => open(d)}>Lihat</Button>
              {editable && <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" loading={remove.isPending && remove.variables?.id === d.id}
                onClick={() => { if (window.confirm('Hapus dokumen ini?')) remove.mutate(d) }} aria-label="Hapus dokumen"><Trash2 className="size-4" /></Button>}
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Unggah dokumen</p>
          <input value={docType} onChange={(e) => setDocType(e.target.value)} maxLength={60} placeholder="Jenis dokumen (sesuai persyaratan)" aria-label="Jenis dokumen" className={inputClass} />
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{file ? 'Ganti berkas' : 'Pilih berkas'}</Button>
            {file && <span className="text-sm text-slate-600">{file.name}</span>}
          </div>
          <p className="text-xs text-slate-500">JPG, PNG, atau PDF, maksimal 5 MB. Berkas bersifat privat dan hanya dapat dilihat petugas PMB yang berwenang.</p>
          <Button loading={upload.isPending} disabled={!file || !docType.trim()} onClick={() => upload.mutate()}><Upload className="size-4" /> Unggah</Button>
        </div>
      ) : <p className="text-xs text-slate-500">Dokumen tidak dapat diubah pada status ini.</p>}
    </div>
  )
}
