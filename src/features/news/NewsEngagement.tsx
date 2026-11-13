import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Heart, MessageCircle, Pencil, Reply, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { LoginPrompt } from '../forum/LoginPrompt'
import { useAuth } from '../../hooks/useAuth'
import { fetchAuthorNames } from '../../services/forum'
import {
  NEWS_COMMENT_MAX, addNewsComment, deleteNewsComment, describeNewsError, fetchNewsEngagement,
  moderateNewsComment, setNewsLike, updateNewsComment, type NewsCommentRow, type NewsEngagementData,
} from '../../services/newsEngagement'
import { formatDateTime } from '../../utils/format'
import { ROLES_MODERATOR } from '../../utils/roles'

type Data = NewsEngagementData

/**
 * Pembaruan LANGSUNG: tampilan diubah seketika (optimistis) atau segera setelah server menjawab, tanpa muat ulang
 * atau masuk ulang. Bila server menolak, tampilan dikembalikan. Data lalu disinkronkan di latar belakang.
 */
function useEngagementMutation(newsId: string, userId?: string) {
  const qc = useQueryClient()
  const key = ['news-engagement', newsId, userId ?? '']
  return async function mutate<T = void>(opts: { request: () => Promise<T>; before?: (d: Data) => Data; after?: (d: Data, r: T) => Data }): Promise<T> {
    const prev = qc.getQueryData<Data>(key)
    const before = opts.before
    if (before) qc.setQueryData<Data>(key, (d) => (d ? before(d) : d))
    try {
      const r = await opts.request()
      const after = opts.after
      if (after) qc.setQueryData<Data>(key, (d) => (d ? after(d, r) : d))
      void qc.invalidateQueries({ queryKey: key })
      return r
    } catch (e) {
      if (prev) qc.setQueryData<Data>(key, prev)
      throw e
    }
  }
}

function withLike(d: Data, target: { newsId?: string; commentId?: string }, like: boolean): Data {
  const id = (target.newsId ?? target.commentId) as string
  const liked = new Set(d.liked)
  if (like) liked.add(id); else liked.delete(id)
  const delta = like ? 1 : -1
  if (target.newsId) return { ...d, liked, newsLikes: Math.max(0, d.newsLikes + delta) }
  return { ...d, liked, likeMap: { ...d.likeMap, [id]: Math.max(0, (d.likeMap[id] ?? 0) + delta) } }
}

const btn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50'

function CommentForm({ newsId, parentId, userId, placeholder = 'Tulis komentar…', autoFocus, onDone }: {
  newsId: string; parentId: string | null; userId: string; placeholder?: string; autoFocus?: boolean; onDone?: () => void
}) {
  const mutate = useEngagementMutation(newsId, userId)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = text.trim().length >= 1 && text.length <= NEWS_COMMENT_MAX

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    try {
      const content = text.trim()
      const names = await fetchAuthorNames([userId]).catch(() => ({} as Record<string, string>))
      await mutate({
        request: () => addNewsComment({ newsId, parentId, content, userId }),
        after: (d, row) => ({ ...d, comments: [...d.comments, row], names: { ...d.names, ...names } }),
      })
      setText('')
      onDone?.()
    } catch (err) { toast.error(describeNewsError(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={NEWS_COMMENT_MAX} placeholder={placeholder} aria-label={placeholder}
        autoFocus={autoFocus} className={inputClass} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{text.length}/{NEWS_COMMENT_MAX}</span>
        <div className="flex gap-2">
          {onDone && <Button variant="ghost" size="sm" onClick={onDone} disabled={busy}>Batal</Button>}
          <Button type="submit" size="sm" loading={busy} disabled={!valid}>Kirim</Button>
        </div>
      </div>
    </form>
  )
}

interface ItemProps {
  comment: NewsCommentRow; authorName: string; likes: number; liked: boolean
  newsId: string; userId?: string; isMod: boolean; isReply?: boolean; rootId: string
}

function CommentItem({ comment: c, authorName, likes, liked, newsId, userId, isMod, isReply, rootId }: ItemProps) {
  const mutate = useEngagementMutation(newsId, userId)
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(c.content)
  const [busy, setBusy] = useState(false)
  const own = userId === c.author_id

  async function run(opts: { request: () => Promise<void>; before?: (d: Data) => Data; ok?: string; onOk?: () => void }) {
    setBusy(true)
    try { await mutate({ request: opts.request, before: opts.before }); opts.onOk?.(); if (opts.ok) toast.success(opts.ok) }
    catch (e) { toast.error(describeNewsError(e)) } finally { setBusy(false) }
  }
  const patchComment = (fn: (x: NewsCommentRow) => NewsCommentRow) => (d: Data): Data => ({ ...d, comments: d.comments.map((x) => (x.id === c.id ? fn(x) : x)) })

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
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={NEWS_COMMENT_MAX} className={inputClass} aria-label="Ubah komentar" />
            <div className="flex gap-2">
              <Button size="sm" loading={busy} disabled={!draft.trim()} onClick={() => { const text = draft.trim(); void run({ request: () => updateNewsComment(c.id, text), before: patchComment((x) => ({ ...x, content: text, updated_at: new Date().toISOString() })), onOk: () => setEditing(false), ok: 'Komentar diperbarui.' }) }}>Simpan</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(c.content) }}>Batal</Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-800">{c.content}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <button type="button" disabled={!userId || busy} className={`${btn} ${liked ? 'text-rose-600' : ''}`} aria-pressed={liked} aria-label={`Sukai komentar (${likes})`}
            title={userId ? undefined : 'Masuk untuk menyukai'} onClick={() => run({ request: () => setNewsLike({ commentId: c.id }, userId as string, !liked), before: (d) => withLike(d, { commentId: c.id }, !liked) })}>
            <Heart className={`size-3.5 ${liked ? 'fill-current' : ''}`} /> {likes}
          </button>
          {userId && !c.is_hidden && <button type="button" className={btn} onClick={() => setReplying((r) => !r)}><Reply className="size-3.5" /> Balas</button>}
          {own && !editing && <button type="button" className={btn} onClick={() => setEditing(true)}><Pencil className="size-3.5" /> Ubah</button>}
          {(own || isMod) && <button type="button" disabled={busy} className={`${btn} hover:text-red-600`} onClick={() => { if (window.confirm('Hapus komentar ini?')) void run({ request: () => deleteNewsComment(c.id), before: (d) => ({ ...d, comments: d.comments.filter((x) => x.id !== c.id && x.parent_id !== c.id) }), ok: 'Komentar dihapus.' }) }}><Trash2 className="size-3.5" /> Hapus</button>}
          {isMod && <button type="button" disabled={busy} className={btn} onClick={() => run({ request: () => moderateNewsComment(c.id, !c.is_hidden), before: patchComment((x) => ({ ...x, is_hidden: !x.is_hidden })), ok: c.is_hidden ? 'Komentar ditampilkan.' : 'Komentar disembunyikan.' })}>
            {c.is_hidden ? <><Eye className="size-3.5" /> Tampilkan</> : <><EyeOff className="size-3.5" /> Sembunyikan</>}</button>}
        </div>
      </div>

      {replying && userId && (
        <div className="ml-6 mt-3 sm:ml-10">
          <CommentForm newsId={newsId} parentId={rootId} userId={userId} placeholder={`Balas ${authorName}…`} autoFocus onDone={() => setReplying(false)} />
        </div>
      )}
    </div>
  )
}

/** Tombol suka berita + kolom komentar (balasan satu tingkat). Komentar & like memerlukan akun. */
export function NewsEngagement({ newsId }: { newsId: string }) {
  const { user, hasRole } = useAuth()
  const mutate = useEngagementMutation(newsId, user?.id)
  const isMod = hasRole(...ROLES_MODERATOR)
  const [busy, setBusy] = useState(false)
  const q = useQuery({ queryKey: ['news-engagement', newsId, user?.id ?? ''], queryFn: () => fetchNewsEngagement(newsId, user?.id),
    refetchInterval: 30_000, refetchOnWindowFocus: true })   // komentar/like dari pengunjung lain ikut muncul

  const comments = q.data?.comments ?? []
  const roots = comments.filter((c) => !c.parent_id)
  const repliesOf = (rid: string) => comments.filter((c) => c.parent_id === rid)
  const newsLiked = q.data?.liked.has(newsId) ?? false

  async function toggleLike() {
    if (!user) return
    setBusy(true)
    try { await mutate({ request: () => setNewsLike({ newsId }, user.id, !newsLiked), before: (d) => withLike(d, { newsId }, !newsLiked) }) }
    catch (e) { toast.error(describeNewsError(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={!user || busy} aria-pressed={newsLiked} title={user ? undefined : 'Masuk untuk menyukai'} onClick={toggleLike}>
          <Heart className={`size-4 ${newsLiked ? 'fill-current text-rose-600' : ''}`} aria-hidden /> {newsLiked ? 'Disukai' : 'Suka'} · {q.data?.newsLikes ?? 0}
        </Button>
        {!user && <span className="text-xs text-slate-500">Masuk untuk menyukai dan berkomentar.</span>}
      </div>

      <section className="mt-10" aria-labelledby="komentar-berita">
        <h2 id="komentar-berita" className="flex items-center gap-2 font-display text-xl font-semibold text-emerald-950">
          <MessageCircle className="size-5" aria-hidden /> Komentar ({comments.filter((c) => !c.is_hidden).length})
        </h2>
        <div className="mt-4">
          {user ? <CommentForm newsId={newsId} parentId={null} userId={user.id} /> : <LoginPrompt text="Masuk untuk ikut berkomentar." />}
        </div>
        <QueryBoundary isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={roots.length === 0}
          emptyTitle="Belum ada komentar" emptyDescription="Jadilah yang pertama berkomentar.">
          <div className="mt-6 space-y-4">
            {roots.map((c) => (
              <div key={c.id} className="space-y-3">
                {[c, ...repliesOf(c.id)].map((x, i) => (
                  <CommentItem key={x.id} comment={x} rootId={c.id} isReply={i > 0} authorName={q.data?.names[x.author_id] ?? 'Pengguna'}
                    likes={q.data?.likeMap[x.id] ?? 0} liked={q.data?.liked.has(x.id) ?? false} newsId={newsId} userId={user?.id} isMod={isMod} />
                ))}
              </div>
            ))}
          </div>
        </QueryBoundary>
      </section>
    </>
  )
}
