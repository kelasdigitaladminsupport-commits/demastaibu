import { supabase } from '../lib/supabase'

export interface RecruitmentPeriod {
  id: string; academic_year: string; name: string; description: string | null
  requirements: string | null; schedule: string | null
  guideline_title: string | null; guideline_path: string | null
  start_date: string; end_date: string
}
export interface DepartmentOption { id: string; name: string }
export interface RecruitmentApplication {
  id: string; registration_no: string; status: string; note_public: string | null; created_at: string
  period_id: string; full_name: string; nim: string; study_program: string | null; semester: number | null
  email: string; phone: string; motivation: string; experience: string | null
  period: { name: string; academic_year: string } | null
  first_department: { name: string } | null
  second_department: { name: string } | null
}
export interface RecruitmentInput {
  periodId: string; firstDepartmentId: string; secondDepartmentId: string
  fullName: string; nim: string; studyProgram: string; semester: string
  email: string; phone: string; motivation: string; experience: string
}

const PERIOD_COLS = 'id, academic_year, name, description, requirements, schedule, guideline_title, guideline_path, start_date, end_date'
export const FK_FIRST = 'departments!recruitment_applications_first_department_id_fkey(name)'
export const FK_SECOND = 'departments!recruitment_applications_second_department_id_fkey(name)'
const APP_COLS = `id, registration_no, status, note_public, created_at, period_id, full_name, nim, study_program, semester, email, phone, motivation, experience, period:recruitment_periods(name, academic_year), first_department:${FK_FIRST}, second_department:${FK_SECOND}`

export function describeRecruitmentError(err: unknown): string {
  const m = (err as { message?: string })?.message ?? ''
  if (/rate_limit_exceeded/.test(m)) return 'Terlalu banyak percobaan. Coba lagi nanti.'
  if (/already_registered/.test(m)) return 'Anda sudah terdaftar pada periode ini.'
  if (/recruitment_closed/.test(m)) return 'Periode pendaftaran sudah ditutup atau belum dimulai.'
  if (/requirements_not_confirmed/.test(m)) return 'Centang semua persyaratan terlebih dahulu.'
  if (/invalid_department/.test(m)) return 'Pilihan bidang tidak valid. Pilihan kedua harus berbeda dari pilihan pertama.'
  if (/login_required/.test(m)) return 'Silakan masuk terlebih dahulu.'
  if (/account_banned/.test(m)) return 'Akun Anda dibatasi.'
  if (/cannot_withdraw/.test(m)) return 'Pendaftaran tidak dapat dibatalkan pada status ini.'
  if (/check constraint|violates/.test(m)) return 'Isian tidak memenuhi aturan panjang/format. Periksa kembali.'
  return 'Terjadi kesalahan. Periksa isian Anda lalu coba lagi.'
}

/** Periode aktif (publik) + daftar bidang yang dapat dipilih. */
export async function fetchRecruitmentInfo(): Promise<{ periods: RecruitmentPeriod[]; departments: DepartmentOption[] }> {
  const [p, d] = await Promise.all([
    supabase.from('recruitment_periods').select(PERIOD_COLS).eq('is_active', true).order('start_date', { ascending: false }),
    supabase.from('departments').select('id, name').order('sort_order').order('name'),
  ])
  if (p.error) throw p.error
  if (d.error) throw d.error
  return { periods: (p.data ?? []) as unknown as RecruitmentPeriod[], departments: (d.data ?? []) as unknown as DepartmentOption[] }
}

/** Pendaftaran milik pengguna. Filter user_id eksplisit: admin yang login juga dapat membaca semua baris lewat RLS. */
export async function fetchMyRecruitment(userId: string): Promise<RecruitmentApplication[]> {
  const { data, error } = await supabase.from('recruitment_applications').select(APP_COLS)
    .eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as RecruitmentApplication[]
}

export async function submitRecruitment(v: RecruitmentInput): Promise<{ id: string; registration_no: string }> {
  const { data, error } = await supabase.rpc('submit_recruitment', {
    p_period_id: v.periodId,
    p_first_department_id: v.firstDepartmentId,
    p_second_department_id: v.secondDepartmentId || null,
    p_full_name: v.fullName.trim(), p_nim: v.nim.trim(),
    p_study_program: v.studyProgram.trim() || null,
    p_semester: v.semester ? Number(v.semester) : null,
    p_email: v.email.trim(), p_phone: v.phone.trim(),
    p_motivation: v.motivation.trim(), p_experience: v.experience.trim() || null,
    p_requirements_confirmed: true,
  })
  if (error) throw new Error(describeRecruitmentError(error))
  return data as { id: string; registration_no: string }
}

export async function withdrawRecruitment(id: string) {
  const { error } = await supabase.rpc('withdraw_recruitment', { p_id: id })
  if (error) throw new Error(describeRecruitmentError(error))
}
