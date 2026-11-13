import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { Container } from '../../components/ui/Container'
import { PageHeader } from '../../components/ui/PageHeader'
import { PageLoading } from '../../components/ui/Loading'
import { LoginPrompt } from '../../features/forum/LoginPrompt'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { createTopic, describeForumError, fetchForumCategories } from '../../services/forum'

interface Values { categoryId: string; title: string; content: string }

export function ForumNewTopicPage() {
  useDocumentTitle('Buat Topik')
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const cats = useQuery({ queryKey: ['forum-categories'], queryFn: fetchForumCategories })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>()

  async function onSubmit(v: Values) {
    if (!user) return
    try {
      const id = await createTopic({ categoryId: v.categoryId, title: v.title.trim(), content: v.content.trim(), userId: user.id })
      toast.success('Topik dibuat.')
      navigate(`/forum/topik/${id}`)
    } catch (e) { toast.error(describeForumError(e)) }
  }

  return (
    <>
      <PageHeader title="Buat Topik Baru" />
      <Container className="max-w-3xl">
        {loading ? <PageLoading /> : !user ? <LoginPrompt text="Anda perlu akun untuk membuat topik." /> : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <p className="text-sm text-slate-600">Topik bersifat publik dan menampilkan nama akun Anda. Patuhi <Link to="/aturan-komunitas" className="font-semibold text-emerald-800 underline">aturan komunitas</Link>.</p>
            <Field label="Kategori *" htmlFor="categoryId" error={errors.categoryId?.message}>
              <select id="categoryId" className={inputClass} disabled={cats.isLoading} {...register('categoryId', { required: 'Pilih kategori' })}>
                <option value="">— Pilih —</option>
                {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {cats.isSuccess && cats.data.length === 0 && <p className="text-sm text-amber-700">Belum ada kategori diskusi. Pengelola perlu membuat kategori terlebih dahulu.</p>}
            <Field label="Judul *" htmlFor="title" error={errors.title?.message}>
              <input id="title" className={inputClass} {...register('title', { required: 'Wajib diisi', minLength: { value: 5, message: 'Minimal 5 karakter' }, maxLength: { value: 200, message: 'Maksimal 200 karakter' } })} />
            </Field>
            <Field label="Isi *" htmlFor="content" error={errors.content?.message}>
              <textarea id="content" rows={9} className={inputClass} {...register('content', { required: 'Wajib diisi', minLength: { value: 5, message: 'Minimal 5 karakter' }, maxLength: { value: 8000, message: 'Maksimal 8000 karakter' } })} />
            </Field>
            <div className="flex gap-3">
              <Button type="submit" loading={isSubmitting}>Terbitkan</Button>
              <Button variant="ghost" onClick={() => navigate('/forum')}>Batal</Button>
            </div>
          </form>
        )}
      </Container>
    </>
  )
}
