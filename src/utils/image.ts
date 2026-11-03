/**
 * Mengecilkan foto sebelum diunggah (foto ponsel sering >5 MB, sedangkan batas bucket 5 MB).
 * Sisi terpanjang dibatasi 1920 px, hasil JPEG kualitas 0,85.
 */
export async function prepareImage(file: File, maxDim = 1920, opts: { keepAlpha?: boolean } = {}): Promise<{ blob: Blob; ext: string; type: string }> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Format gambar harus JPG, PNG, atau WebP.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const alreadySmall = scale === 1 && file.size <= 1_500_000
  if (alreadySmall) {
    bitmap.close()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    return { blob: file, ext, type: file.type }
  }
  // Logo: pertahankan transparansi (PNG/WebP) dengan menyimpan hasil sebagai PNG.
  const asPng = Boolean(opts.keepAlpha) && (file.type === 'image/png' || file.type === 'image/webp')
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Peramban tidak mendukung pemrosesan gambar.')
  if (!asPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const outType = asPng ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, outType, 0.85))
  if (!blob) throw new Error('Gagal memproses gambar.')
  if (blob.size > 5 * 1024 * 1024) throw new Error('Gambar masih lebih dari 5 MB setelah dikecilkan.')
  return { blob, ext: asPng ? 'png' : 'jpg', type: outType }
}
