interface DbError { code?: string; message?: string }

/** Terjemahkan error database menjadi pesan yang ramah dan tidak membocorkan detail teknis. */
export function describeDbError(err: unknown): string {
  const e = (err ?? {}) as DbError
  if (e.message?.includes('last_super_admin')) return 'Tidak dapat mencabut Super Admin terakhir. Tunjuk Super Admin lain terlebih dahulu.'
  if (e.message?.includes('partner_consent_required')) return 'Mitra asal permohonan belum menyetujui publikasi, sehingga sponsor ini tidak dapat ditayangkan.'
  switch (e.code) {
    case '23505': return 'Data dengan nilai yang sama sudah ada (misalnya slug sudah dipakai). Ubah lalu coba lagi.'
    case '23503': return 'Data ini masih dipakai oleh data lain, sehingga tidak dapat diubah atau dihapus.'
    case '23514': return 'Isian tidak memenuhi aturan (periksa panjang teks atau urutan tanggal).'
    case '23502': return 'Ada isian wajib yang belum diisi.'
    case '42501': return 'Anda tidak memiliki izin untuk tindakan ini.'
    default: return 'Terjadi kesalahan. Silakan coba lagi.'
  }
}
