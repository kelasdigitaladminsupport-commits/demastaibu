import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './styles/index.css'
import { queryClient } from './lib/queryClient'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider } from './features/auth/AuthProvider'
import { router } from './routes'
import { ConfigMissing } from './components/ConfigMissing'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    ) : (
      <ConfigMissing />
    )}
  </StrictMode>,
)
