import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ClipboardCheck, Eye, EyeOff, Flag, Heart, Lock, LockOpen, Pin, PinOff } from 'lucide-react'
import { toast } from 'sonner'
import { Container } from '../../components/ui/Container'
import { Button } from '../../components/ui/Button'
import { QueryBoundary } from '../../components/ui/QueryBoundary'
import { ShareButtons } from '../../components/ui/ShareButtons'
import { CommentForm } from '../../features/forum/CommentForm'
import { CommentItem } from '../../features/forum/CommentItem'
import { LoginPrompt } from '../../features/forum/LoginPrompt'
import { ReportDialog } from '../../features/forum/ReportDialog'
import { NotFoundPage } from './NotFoundPage'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { describeForumError, fetchAuthorNames, fetchThread, fetchTopic, moderateTopic, setLike } from '../../services/forum'
import { formatDateTime } from '../../utils/format'
import { ROLES_MODERATOR } from '../../utils/roles'

export function ForumTopicPage() {
  const { id = '' } = useParams()
  const { user, hasRole } = useAuth()
  const qc = useQueryClient()
  const isMod = hasRole(...ROLES_MODERATOR)
  const [report, setReport] = useState<{ topicId?: string; commentId?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const topic = useQuery({ queryKey: ['forum-topic', id], queryFn: () => fetchTopic(id) })
  const t = topic.data
  const thread = useQuery({ queryKey: ['forum-thread', id, user?.id ?? ''], queryFn: () => fetchThread(id, user?.id), enabled: Boolean(t) })
  const author = useQuery({ queryKey: ['forum-author', t?.author_id], queryFn: () => fetchAuthorNames([t!.author_id]), enabled: Boolean(t) })
  useDocumentTitle(t?.title)

  async function mod(patch: Parameters<typeof moderateTopic>[1], ok: string) {
    setBusy(true)
    try { await moderateTopic(id, patch); toast.success(ok); await qc.invalidateQueries({ queryKey: ['forum-topic', id] }); qc.invalidateQueries({ queryKey: ['forum-topics'] }) }
    catch (e) { toast.error(describeForumError(e)) } finally { setBusy(false) }
  }

  async function toggleTopicLike(liked: boolean) {
    if (!user) return
    setBusy(true)
    try { await setLike({ topicId: id }, user.id, !liked); await qc.invalidateQueries({ queryKey: ['forum-thread', id] }) }
    catch (e) { toast.error(describeForumError(e)) } finally { setBusy(false) }
  }

  if (!topic.isLoading && !topic.error && !t) return <NotFoundPage />

  const comments = thread.data?.comments ?? []
  const roots = comments.filter((c) => !c.parent_id)
  const repliesOf = (rid: string) => comments.filter((c) => c.parent_id === rid)
  const open = t?.status === 'open'
  const topicLiked = thread.data?.liked.has(id) ?? false

  return (
    <Container className="max-w-3xl">
      <Link to="/forum" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="size-4" /> Semua topik</Link>
      <QueryBoundary isLoading={topic.isLoading} error={topic.error} onRetry={() => topic.refetch()} isEmpty={!t} emptyTitle="Topik tidak ditemukan">
        {t && (
          <>
            <article>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {t.category && <span className="font-semibold uppercase tracking-wide text-gold-dark">{t.category.name}</span>}
                {t.is_pinned && <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 font-semibold text-gold-dark"><Pin className="size-3" /> Disematkan</span>}
                {t.is_evaluation_material && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800"><ClipboardCheck className="size-3" /> Bahan evaluasi</span>}
                {t.status === 'closed' && <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700"><Lock className="size-3" /> Diskusi ditutup</span>}
                {t.status === 'hidden' && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Disembunyikan moderator</span>}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-emerald-950">{t.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{author.data?.[t.author_id] ?? 'Pengguna'} · {formatDateTime(t.created_at)}</p>
              <p className="mt-6 whitespace-pre-line break-words leading-relaxed text-slate-800">{t.content}</p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" disabled={!user || busy} aria-pressed={topicLiked} onClick={() => toggleTopicLike(topicLiked)}>
                  <Heart className={`size-4 ${topicLiked ? 'fill-current text-rose-600' : ''}`} /> {thread.data?.topicLikes ?? 0}
                </Button>
                {user && user.id !== t.author_id && <Button variant="ghost" size="sm" onClick={() => setReport({ topicId: id })}><Flag className="size-4" /> Laporkan</Button>}
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4"><ShareButtons title={t.title} /></div>
            </article>

            {isMod && (
              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Panel moderator</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => mod({ status: t.status === 'closed' ? 'open' : 'closed' }, t.status === 'closed' ? 'Diskusi dibuka.' : 'Diskusi ditutup.')}>
                    {t.status === 'closed' ? <><LockOpen className="size-4" /> Buka diskusi</> : <><Lock className="size-4" /> Tutup diskusi</>}</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => mod({ is_pinned: !t.is_pinned }, t.is_pinned ? 'Sematan dilepas.' : 'Topik disematkan.')}>
                    {t.is_pinned ? <><PinOff className="size-4" /> Lepas sematan</> : <><Pin className="size-4" /> Sematkan</>}</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => mod({ is_evaluation_material: !t.is_evaluation_material }, t.is_evaluation_material ? 'Tanda evaluasi dilepas.' : 'Ditandai sebagai bahan evaluasi.')}>
                    <ClipboardCheck className="size-4" /> {t.is_evaluation_material ? 'Lepas tanda evaluasi' : 'Tandai bahan evaluasi'}</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => mod({ status: t.status === 'hidden' ? 'open' : 'hidden' }, t.status === 'hidden' ? 'Topik ditampilkan.' : 'Topik disembunyikan.')}>
                    {t.status === 'hidden' ? <><Eye className="size-4" /> Tampilkan</> : <><EyeOff className="size-4" /> Sembunyikan</>}</Button>
                </div>
              </div>
            )}

            <section className="mt-10" aria-labelledby="komentar">
              <h2 id="komentar" className="font-display text-xl font-semibold text-emerald-950">Komentar ({comments.filter((c) => !c.is_hidden).length})</h2>
              <div className="mt-4">
                {!user ? <LoginPrompt text="Masuk untuk ikut berkomentar." />
                  : !open ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Diskusi ini tidak menerima komentar baru.</p>
                  : <CommentForm topicId={id} parentId={null} userId={user.id} />}
              </div>

              <QueryBoundary isLoading={thread.isLoading} error={thread.error} onRetry={() => thread.refetch()} isEmpty={roots.length === 0}
                emptyTitle="Belum ada komentar" emptyDescription="Jadilah yang pertama berkomentar.">
                <div className="mt-6 space-y-4">
                  {roots.map((c) => (
                    <div key={c.id} className="space-y-3">
                      {[c, ...repliesOf(c.id)].map((x, i) => (
                        <CommentItem key={x.id} comment={x} rootId={c.id} isReply={i > 0} authorName={thread.data?.names[x.author_id] ?? 'Pengguna'}
                          likes={thread.data?.likeMap[x.id] ?? 0} liked={thread.data?.liked.has(x.id) ?? false} topicId={id} topicOpen={open}
                          userId={user?.id} isMod={isMod} onReport={(cid) => setReport({ commentId: cid })} />
                      ))}
                    </div>
                  ))}
                </div>
              </QueryBoundary>
            </section>
          </>
        )}
      </QueryBoundary>
      {user && <ReportDialog target={report} userId={user.id} onClose={() => setReport(null)} />}
    </Container>
  )
}
