import { z } from 'zod'

export const emailSchema = z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid')

export const passwordSchema = z
  .string()
  .min(8, 'Minimal 8 karakter')
  .regex(/[A-Za-z]/, 'Harus mengandung huruf')
  .regex(/[0-9]/, 'Harus mengandung angka')
