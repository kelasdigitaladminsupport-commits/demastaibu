import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { describeForumError, reportContent } from '../../services/forum'

export function ReportDialog({ target, userId, onClose }: { target: { topicId?: string; commentId?: string } | null; userId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  if (!target) return null
  const valid = reason.trim().length >= 3

  async function submit() {
    setBusy(true)
    try {
      await reportContent({ ...target, reason: reason.trim(), userId })
      toast.success('Laporan terkirim. Terima kasih.')
      setReason(''); onClose()
    } catch (e) { toast.error(describeForumError(e)) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="rep-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="rep-title" className="font-display text-lg font-semibold">Laporkan konten</h2>
        <p className="mt-1 text-sm text-slate-600">Jelaskan alasan Anda. Moderator akan meninjau laporan ini.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000} className={`${inputClass} mt-4`} aria-label="Alasan laporan" />
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Batal</Button>
          <Button onClick={submit} loading={busy} disabled={!valid}>Kirim laporan</Button>
        </div>
      </div>
    </div>
  )
}
