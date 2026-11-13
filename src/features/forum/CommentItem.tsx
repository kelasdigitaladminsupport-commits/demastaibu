import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { EyeOff, Eye, Flag, Heart, Pencil, Reply, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { CommentForm } from './CommentForm'
import { deleteComment, describeForumError, moderateComment, setLike, updateComment, type CommentRow } from '../../services/forum'
import { formatDateTime } from '../../utils/format'

interface Props {
  comment: CommentRow
  authorName: string
  likes: number
  liked: boolean
  topicId: string
  topicOpen: boolean
  userId?: string
  isMod: boolean
  isReply?: boolean
  rootId: string
  onReport: (commentId: string) => void
}

export function CommentItem({ comment: c, authorName, likes, liked, topicId, topicOpen, userId, isMod, isReply, rootId, onReport }: Props) {
  const qc = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(c.content)
  const [busy, setBusy] = useState(false)
  const own = userId === c.author_id
  const refresh = () => qc.invalidateQueries({ queryKey: ['forum-thread', topicId] })

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true)
    try { await fn(); if (ok) toast.success(ok); await refresh() } catch (e) { toast.error(describeForumError(e)) } finally { setBusy(false) }
  }

  const btn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50'

  return (
    <div className={isReply ? 'ml-6 border-l-2 border-emerald-100 pl-4 sm:ml-10' : ''}>
      <div className={`rounded-xl border p-4 ${c.is_hidden ? 'border-dashed border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{authorName}</span>
          <span>{formatDateTime(c.created_at)}</span>
          {c.updated_at !== c.created_at && <span className="italic">(diedit)</span>}
          {c.is_hidden && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Disembunyikan moderator</span>}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={4000} className={inputClass} aria-label="Ubah komentar" />
            <div className="flex gap-2">
              <Button size="sm" loading={busy} disabled={!draft.trim()} onClick={() => run(async () => { await updateComment(c.id, draft.trim()); setEditing(false) }, 'Komentar diperbarui.')}>Simpan</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(c.content) }}>Batal</Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-800">{c.content}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <button type="button" disabled={!userId || busy} className={`${btn} ${liked ? 'text-rose-600' : ''}`} aria-pressed={liked}
            title={userId ? undefined : 'Masuk untuk menyukai'} onClick={() => run(() => setLike({ commentId: c.id }, userId as string, !liked))}>
            <Heart className={`size-3.5 ${liked ? 'fill-current' : ''}`} /> {likes}
          </button>
          {userId && topicOpen && !c.is_hidden && <button type="button" className={btn} onClick={() => setReplying((r) => !r)}><Reply className="size-3.5" /> Balas</button>}
          {userId && !own && <button type="button" className={btn} onClick={() => onReport(c.id)}><Flag className="size-3.5" /> Laporkan</button>}
          {own && !editing && <button type="button" className={btn} onClick={() => setEditing(true)}><Pencil className="size-3.5" /> Ubah</button>}
          {(own || isMod) && <button type="button" disabled={busy} className={`${btn} hover:text-red-600`} onClick={() => { if (window.confirm('Hapus komentar ini?')) void run(() => deleteComment(c.id), 'Komentar dihapus.') }}><Trash2 className="size-3.5" /> Hapus</button>}
          {isMod && <button type="button" disabled={busy} className={btn} onClick={() => run(() => moderateComment(c.id, !c.is_hidden), c.is_hidden ? 'Komentar ditampilkan.' : 'Komentar disembunyikan.')}>
            {c.is_hidden ? <><Eye className="size-3.5" /> Tampilkan</> : <><EyeOff className="size-3.5" /> Sembunyikan</>}</button>}
        </div>
      </div>

      {replying && userId && (
        <div className="ml-6 mt-3 sm:ml-10">
          <CommentForm topicId={topicId} parentId={rootId} userId={userId} placeholder={`Balas ${authorName}…`} autoFocus onDone={() => setReplying(false)} />
        </div>
      )}
    </div>
  )
}
