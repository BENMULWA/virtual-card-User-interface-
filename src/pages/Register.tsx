/**
 * Register.tsx - create an account.
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { AuthLayout } from '@/components/Layout'
import { Alert, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

interface FormState {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  acceptedTerms: boolean
}

const INITIAL: FormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
}

/** Mirrors the backend's password policy so the user is told before submitting. */
function passwordProblems(password: string): string[] {
  const problems: string[] = []
  if (password.length < 10) problems.push('At least 10 characters')
  if (password && password.toLowerCase() === password) problems.push('An upper case letter')
  if (password && password.toUpperCase() === password) problems.push('A lower case letter')
  if (password && !/\d/.test(password)) problems.push('A number')
  if (password && !/[!@#$%^&*()\-_=+[\]{};:,.?/]/.test(password)) problems.push('A special character')
  return problems
}

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const problems = passwordProblems(form.password)
  const passwordsMatch = form.confirmPassword === form.password
  const canSubmit =
    form.fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.phone.trim().length >= 9 &&
    problems.length === 0 &&
    passwordsMatch &&
    form.acceptedTerms

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await signUp({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        acceptedTerms: form.acceptedTerms,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again in a moment.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="card-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Start your virtual card application. It takes about five minutes.
        </p>

        {error && (
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="fullName" className="field-label">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              className="field-input"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="field-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="jane@example.com"
              required
            />
            <p className="field-hint">
              We send your verification code here, so it must be one you can reach.
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="field-label">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              className="field-input"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="0712345678"
              required
            />
            <p className="field-hint">Safaricom number, used for M-Pesa top-ups.</p>
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
            />
            {form.password && problems.length > 0 && (
              <p className="field-hint">Needs: {problems.join(', ')}.</p>
            )}
            {form.password && problems.length === 0 && (
              <p className="mt-1.5 text-xs text-emerald-600">Password looks good.</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="field-label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              required
            />
            {form.confirmPassword && !passwordsMatch && (
              <p className="field-error">The passwords do not match.</p>
            )}
          </div>

          <label className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.acceptedTerms}
              onChange={(e) => update('acceptedTerms', e.target.checked)}
            />
            <span className="text-sm text-slate-600">
              I accept the Mamlaka card terms and the privacy policy.
            </span>
          </label>

          <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!canSubmit}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
