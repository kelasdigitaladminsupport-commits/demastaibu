import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { addComment, describeForumError } from '../../services/forum'

interface Props { topicId: string; parentId: string | null; userId: string; onDone?: () => void; placeholder?: string; autoFocus?: boolean }

export function CommentForm({ topicId, parentId, userId, onDone, placeholder = 'Tulis komentar…', autoFocus }: Props) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = text.trim().length >= 1 && text.length <= 4000

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    try {
      await addComment({ topicId, parentId, content: text.trim(), userId })
      setText('')
      await qc.invalidateQueries({ queryKey: ['forum-thread', topicId] })
      qc.invalidateQueries({ queryKey: ['forum-topics'] })
      onDone?.()
    } catch (err) { toast.error(describeForumError(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} placeholder={placeholder} aria-label={placeholder}
        autoFocus={autoFocus} className={inputClass} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{text.length}/4000</span>
        <div className="flex gap-2">
          {onDone && <Button variant="ghost" size="sm" onClick={onDone} disabled={busy}>Batal</Button>}
          <Button type="submit" size="sm" loading={busy} disabled={!valid}>Kirim</Button>
        </div>
      </div>
    </form>
  )
}
