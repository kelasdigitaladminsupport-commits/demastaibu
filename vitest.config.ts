import { defineConfig } from 'vitest/config'

// Uji asap (smoke test): merender setiap halaman dengan Supabase palsu di jsdom.
// Dijalankan dengan:  npm run test:smoke
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    testTimeout: 20000,
  },
})
