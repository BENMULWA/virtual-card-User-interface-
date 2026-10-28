/**
 * VerifyEmail.tsx - confirm the email address.
 *
 * Reached from the link in the verification email: /verify-email?token=...
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { auth } from '@/api/api'
import { AuthLayout } from '@/components/Layout'
import { Alert, Button, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

type State = 'verifying' | 'success' | 'error'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { refreshUser, user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<State>('verifying')
  const [message, setMessage] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    // React 18 StrictMode runs effects twice in development - guard it.
    if (started.current) return
    started.current = true

    if (!token) {
      setState('error')
      setMessage('This link is missing its verification token. Request a new one below.')
      return
    }

    const run = async () => {
      try {
        await auth.verifyEmail(token)
        await refreshUser()
        setState('success')
      } catch (err) {
        setState('error')
        setMessage(
          err instanceof ApiError
            ? err.message
            : 'We could not verify your email. The link may have expired.',
        )
      }
    }
    void run()
  }, [token, refreshUser])

  const resend = async () => {
    if (!user?.email) return
    try {
      await auth.resendVerification(user.email)
      setResent(true)
    } catch {
      setResent(true) // the endpoint always succeeds by design
    }
  }

  return (
    <AuthLayout>
      <div className="card-surface p-6 text-center sm:p-8">
        {state === 'verifying' && (
          <>
            <Spinner className="mx-auto h-8 w-8 text-brand-600" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Verifying your email</h1>
            <p className="mt-1.5 text-sm text-slate-500">One moment while we check your link.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Email verified</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Your email is confirmed. You can continue with your application.
            </p>
            <Button className="mt-6" fullWidth onClick={() => navigate('/dashboard')}>
              Continue to my application
            </Button>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900">We could not verify that link</h1>
            <div className="mt-4 text-left">
              <Alert tone="error">{message}</Alert>
            </div>
            {user && (
              <Button className="mt-4" variant="secondary" fullWidth onClick={resend}>
                {resent ? 'Verification email sent' : 'Send a new verification email'}
              </Button>
            )}
          </>
        )}

        <p className="mt-6 text-sm text-slate-500">
          <Link to="/dashboard" className="font-medium text-brand-700 hover:text-brand-800">
            Go to my application
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
