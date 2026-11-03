import { supabase } from '../lib/supabase'

const MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email atau kata sandi salah.'],
  [/email not confirmed/i, 'Email belum diverifikasi. Periksa kotak masuk Anda.'],
  [/user already registered/i, 'Email ini sudah terdaftar. Silakan masuk.'],
  [/password should be at least/i, 'Kata sandi terlalu pendek.'],
  [/not authorized/i, 'Layanan email verifikasi belum siap. Silakan hubungi pengelola website.'],
  [/rate limit|too many/i, 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'],
  [/same password/i, 'Kata sandi baru tidak boleh sama dengan yang lama.'],
  [/network|failed to fetch/i, 'Tidak dapat terhubung ke server. Periksa koneksi internet.'],
]

export function translateAuthError(message: string): string {
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? 'Terjadi kesalahan. Silakan coba lagi.'
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
}

export async function signUp(fullName: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/masuk`,
    },
  })
  if (error) throw new Error(translateAuthError(error.message))
  // Bila "Confirm email" aktif, session = null sampai email diverifikasi.
  return { needsEmailConfirmation: !data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(translateAuthError(error.message))
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw new Error(translateAuthError(error.message))
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(translateAuthError(error.message))
}
