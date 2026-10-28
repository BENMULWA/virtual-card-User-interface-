/**
 * App.tsx - routing.
 *
 * The authenticated area is wrapped in a guard that redirects to /login when
 * there is no session, and to /dashboard when there is one but the user tried
 * to open a public page.
 */

import { useEffect, useState, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { Spinner } from '@/components/ui'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { CardDetail } from '@/pages/CardDetail'
import { Cards } from '@/pages/Cards'
import { Dashboard } from '@/pages/Dashboard'
import { KycDetails } from '@/pages/KycDetails'
import { KycDocuments } from '@/pages/KycDocuments'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Profile } from '@/pages/Profile'
import { Register } from '@/pages/Register'
import { VerifyEmail } from '@/pages/VerifyEmail'
import { Wallet } from '@/pages/Wallet'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/**
 * The shell for signed-in pages. It owns the single journey subscription so
 * every screen sees the same live state.
 */
function AppShell() {
  const { isAuthenticated } = useAuth()
  const [live, setLive] = useState(false)

  // A single lightweight subscription just for the header indicator.
  useEffect(() => {
    setLive(isAuthenticated)
  }, [isAuthenticated])

  return (
    <Layout live={live}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/kyc/documents" element={<KycDocuments />} />
        <Route path="/kyc/details" element={<KycDetails />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/cards/:cardNo" element={<CardDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        The page you are looking for does not exist.
      </p>
      <a
        href="/"
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go home
      </a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated>
                <Landing />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthenticated>
                <Register />
              </RedirectIfAuthenticated>
            }
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
