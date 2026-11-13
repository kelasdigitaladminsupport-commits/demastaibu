import { supabase } from '../lib/supabase'
import { prepareImage } from '../utils/image'

export interface PmbPeriod {
  id: string; academic_year: string; name: string; description: string | null
  requirements: string | null; schedule: string | null; start_date: string; end_date: string
}
export interface StudyProgram { id: string; name: string; level: string | null; description: string | null }
export interface Application {
  id: string; registration_no: string; status: string; created_at: string
  period_id: string; program_id: string
  full_name: string; birth_place: string | null; birth_date: string | null; gender: string | null
  email: string; phone: string | null; address: string | null; previous_school: string | null
  graduation_year: number | null; guardian_name: string | null; guardian_phone: string | null
  period: { name: string; academic_year: string } | null
  program: { name: string } | null
}
export interface ApplicantDoc { id: string; doc_type: string; file_path: string; original_name: string | null; mime_type: string | null; size_bytes: number | null; created_at: string }
export interface HistoryItem { status: string; note: string | null; at: string }
export interface PmbTrack { registration_no: string; status: string; submitted_at: string; period: string | null; program: string | null; history: HistoryItem[] }
export interface SubmitInput {
  periodId: string; programId: string; fullName: string; birthPlace: string; birthDate: string; gender: string
  email: string; phone: string; address: string; previousSchool: string; graduationYear: string; guardianName: string; guardianPhone: string
}

const APP_COLS = 'id, registration_no, status, created_at, period_id, program_id, full_name, birth_place, birth_date, gender, email, phone, address, previous_school, graduation_year, guardian_name, guardian_phone, period:pmb_periods(name, academic_year), program:study_programs(name)'

export function describePmbError(err: unknown): string {
  const m = (err as { message?: string })?.message ?? ''
  if (/rate_limit_exceeded/.test(m)) return 'Terlalu banyak percobaan. Coba lagi nanti.'
  if (/already_registered/.test(m)) return 'Anda sudah terdaftar pada periode ini.'
  if (/pmb_closed/.test(m)) return 'Pendaftaran belum dibuka.'
  if (/pmb_period_closed/.test(m)) return 'Periode pendaftaran sudah ditutup atau belum dimulai.'
  if (/invalid_program/.test(m)) return 'Program studi tidak tersedia.'
  if (/login_required/.test(m)) return 'Silakan masuk terlebih dahulu.'
  if (/account_banned/.test(m)) return 'Akun Anda dibatasi.'
  return 'Terjadi kesalahan. Periksa isian Anda lalu coba lagi.'
}

export async function fetchPmbInfo(): Promise<{ periods: PmbPeriod[]; programs: StudyProgram[] }> {
  const [p, s] = await Promise.all([
    supabase.from('pmb_periods').select('id, academic_year, name, description, requirements, schedule, start_date, end_date')
      .eq('is_active', true).order('start_date', { ascending: false }),
    supabase.from('study_programs').select('id, name, level, description').eq('is_active', true).order('sort_order').order('name'),
  ])
  if (p.error) throw p.error
  if (s.error) throw s.error
  return { periods: (p.data ?? []) as unknown as PmbPeriod[], programs: (s.data ?? []) as unknown as StudyProgram[] }
}

export async function submitApplicant(v: SubmitInput): Promise<{ id: string; registration_no: string; tracking_code: string }> {
  const { data, error } = await supabase.rpc('submit_applicant', {
    p_period_id: v.periodId, p_program_id: v.programId, p_full_name: v.fullName.trim(),
    p_birth_place: v.birthPlace.trim() || null, p_birth_date: v.birthDate || null, p_gender: v.gender || null,
    p_email: v.email.trim(), p_phone: v.phone.trim() || null, p_address: v.address.trim() || null,
    p_previous_school: v.previousSchool.trim() || null, p_graduation_year: v.graduationYear ? Number(v.graduationYear) : null,
    p_guardian_name: v.guardianName.trim() || null, p_guardian_phone: v.guardianPhone.trim() || null,
  })
  if (error) throw new Error(describePmbError(error))
  return data as { id: string; registration_no: string; tracking_code: string }
}

export async function trackApplicant(reg: string, code: string): Promise<PmbTrack | null> {
  const { data, error } = await supabase.rpc('track_applicant', { p_reg: reg.trim(), p_code: code.trim() })
  if (error) throw new Error(describePmbError(error))
  return (data as PmbTrack | null) ?? null
}

export async function fetchMyApplications(): Promise<Application[]> {
  const { data, error } = await supabase.from('applicants').select(APP_COLS).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Application[]
}

export async function fetchMyApplication(id: string): Promise<Application | null> {
  const { data, error } = await supabase.from('applicants').select(APP_COLS).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as unknown as Application | null)
}

export async function fetchMyHistory(id: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase.rpc('my_applicant_history', { p_applicant_id: id })
  if (error) throw error
  return (data as HistoryItem[] | null) ?? []
}

export async function updateMyApplication(id: string, v: Omit<SubmitInput, 'periodId' | 'programId'>) {
  const { error } = await supabase.from('applicants').update({
    full_name: v.fullName.trim(), birth_place: v.birthPlace.trim() || null, birth_date: v.birthDate || null, gender: v.gender || null,
    email: v.email.trim(), phone: v.phone.trim() || null, address: v.address.trim() || null,
    previous_school: v.previousSchool.trim() || null, graduation_year: v.graduationYear ? Number(v.graduationYear) : null,
    guardian_name: v.guardianName.trim() || null, guardian_phone: v.guardianPhone.trim() || null,
  }).eq('id', id)
  if (error) throw error
}

export async function fetchDocuments(applicantId: string): Promise<ApplicantDoc[]> {
  const { data, error } = await supabase.from('applicant_documents')
    .select('id, doc_type, file_path, original_name, mime_type, size_bytes, created_at').eq('applicant_id', applicantId).order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as ApplicantDoc[]
}

/** Tautan sementara (5 menit) untuk berkas privat. */
export async function signedDocUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('pmb-documents').createSignedUrl(path, 300)
  return data?.signedUrl ?? null
}

export async function uploadDocument(o: { userId: string; applicantId: string; docType: string; file: File }): Promise<void> {
  let body: Blob = o.file; let ext = 'pdf'; let type = 'application/pdf'
  if (o.file.type === 'application/pdf') {
    if (o.file.size > 5 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 5 MB.')
  } else {
    const img = await prepareImage(o.file)
    body = img.blob; ext = img.ext; type = img.type
  }
  if (type === 'image/webp') throw new Error('Format WebP tidak diterima untuk dokumen. Gunakan JPG, PNG, atau PDF.')
  const path = `${o.userId}/${o.applicantId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('pmb-documents').upload(path, body, { contentType: type, upsert: false })
  if (up.error) throw new Error('Dokumen gagal diunggah.')
  const { error } = await supabase.from('applicant_documents').insert({
    applicant_id: o.applicantId, doc_type: o.docType.trim(), file_path: path, original_name: o.file.name.slice(0, 200), mime_type: type, size_bytes: body.size,
  })
  if (error) {
    await supabase.storage.from('pmb-documents').remove([path])
    throw new Error('Dokumen tidak dapat disimpan. Pendaftaran mungkin sudah tidak dapat diubah.')
  }
}

export async function deleteDocument(doc: ApplicantDoc) {
  const { error } = await supabase.from('applicant_documents').delete().eq('id', doc.id)
  if (error) throw new Error('Dokumen tidak dapat dihapus. Pendaftaran mungkin sudah tidak dapat diubah.')
  await supabase.storage.from('pmb-documents').remove([doc.file_path])
}
