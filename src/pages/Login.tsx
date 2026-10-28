/**
 * Login.tsx - sign in.
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { AuthLayout } from '@/components/Layout'
import { Alert, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setError(err.message)
      } else {
        // The backend returns the same message for a wrong password and an unknown
        // email, so we do not need to (and must not) distinguish them here.
        setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="card-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Sign in to continue your card application.
        </p>

        {error && (
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!email || !password}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to Mamlaka?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:text-brand-800">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
