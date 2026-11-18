import { supabase } from '../lib/supabase'

export interface PartnershipTrack {
  reference_no: string; org_name: string; status: string; created_at: string; updated_at: string
  history: Array<{ note: string; status: string | null; at: string }>
}
export interface Sponsor { id: string; name: string; logo_path: string | null; description: string | null; website_url: string | null }

function mapError(message: string): string {
  if (/rate_limit_exceeded/.test(message)) return 'Terlalu banyak percobaan. Coba lagi nanti.'
  if (/invalid_proposal_path/.test(message)) return 'Berkas proposal tidak valid.'
  if (/otp_cooldown/.test(message)) return 'Mohon tunggu sebentar sebelum meminta kode baru.'
  if (/otp_unavailable/.test(message)) return 'Layanan pengiriman kode belum tersedia. Silakan hubungi pengelola.'
  if (/invalid_email/.test(message)) return 'Format email tidak valid.'
  if (/email_not_verified/.test(message)) return 'Verifikasi email belum valid atau sudah kedaluwarsa. Mohon verifikasi ulang email Anda.'
  if (/invalid_token/.test(message)) return 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.'
  return 'Permintaan gagal diproses. Periksa isian Anda lalu coba lagi.'
}

/** Proposal PDF diunggah anonim ke folder incoming/ (bucket privat; hanya admin yang dapat membacanya). */
export async function uploadProposal(file: File): Promise<string> {
  if (file.type !== 'application/pdf') throw new Error('Proposal harus berformat PDF.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran proposal maksimal 5 MB.')
  const path = `incoming/${crypto.randomUUID()}.pdf`
  const { error } = await supabase.storage.from('partnership-proposals').upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (error) throw new Error('Proposal gagal diunggah.')
  return path
}

export interface PartnershipInput {
  orgName: string; contactPerson: string; email: string; phone?: string; partnerType: string
  cooperationType: string; supportedProgram?: string; supportForm?: string; supportValue?: number | null
  message: string; publishConsent: boolean; proposalPath?: string | null
  /** Bukti verifikasi email dari verifyPartnershipEmailCode (wajib). */
  emailProof: string
}

export async function submitPartnership(v: PartnershipInput): Promise<string> {
  const { data, error } = await supabase.rpc('submit_partnership', {
    p_org_name: v.orgName, p_contact_person: v.contactPerson, p_email: v.email, p_phone: v.phone || null,
    p_partner_type: v.partnerType, p_cooperation_type: v.cooperationType, p_supported_program: v.supportedProgram || null,
    p_support_form: v.supportForm || null, p_support_value: v.supportValue ?? null, p_message: v.message,
    p_publish_consent: v.publishConsent, p_proposal_path: v.proposalPath || null, p_email_proof: v.emailProof,
  })
  if (error) throw new Error(mapError(error.message))
  return data as string
}

export async function trackPartnership(ref: string, email: string): Promise<PartnershipTrack | null> {
  const { data, error } = await supabase.rpc('track_partnership', { p_ref: ref.trim(), p_email: email.trim() })
  if (error) throw new Error(mapError(error.message))
  return (data as PartnershipTrack | null) ?? null
}

export async function fetchSponsors(): Promise<Sponsor[]> {
  const { data, error } = await supabase.from('sponsors').select('id, name, logo_path, description, website_url')
    .eq('is_published', true).order('sort_order').order('name')
  if (error) throw error
  return (data ?? []) as unknown as Sponsor[]
}

/** Dipanggil saat pemilik email menekan tombol di halaman verifikasi (bukan otomatis saat tautan dibuka). */
export async function verifyPartnershipEmail(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('verify_partnership_email', { p_token: token })
  if (error) throw new Error(mapError(error.message))
  return (data as { reference_no: string }).reference_no
}

/** Meminta kode OTP 6 digit dikirim ke email (berlaku 10 menit; jeda 60 detik antar permintaan). */
export async function requestPartnershipEmailCode(email: string): Promise<void> {
  const { error } = await supabase.rpc('request_partnership_email_code', { p_email: email.trim() })
  if (error) throw new Error(mapError(error.message))
}

/** Memeriksa kode OTP. Bila benar, mengembalikan bukti verifikasi sekali pakai untuk dikirim bersama formulir. */
export async function verifyPartnershipEmailCode(email: string, code: string): Promise<string> {
  const { data, error } = await supabase.rpc('verify_partnership_email_code', { p_email: email.trim(), p_code: code })
  if (error) throw new Error(mapError(error.message))
  const r = data as { verified: boolean; reason?: string; token?: string } | null
  if (!r?.verified || !r.token) {
    throw new Error(r?.reason === 'expired' ? 'Kode sudah kedaluwarsa. Silakan kirim ulang kode.'
      : r?.reason === 'locked' ? 'Terlalu banyak percobaan yang salah. Silakan kirim ulang kode baru.'
      : 'Kode salah. Periksa kembali kode pada email Anda.')
  }
  return r.token
}
