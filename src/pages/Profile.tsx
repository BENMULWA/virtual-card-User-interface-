/**
 * Profile.tsx - account details and password change.
 */

import { useState, type FormEvent } from 'react'

import { ApiError } from '@/api/client'
import { auth } from '@/api/api'
import { Alert, Badge, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export function Profile() {
  const { user, refreshUser, signOut } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = newPassword === confirmPassword
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 10 && passwordsMatch

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await auth.changePassword(currentPassword, newPassword)
      setSuccess('Your password has been updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await refreshUser()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not change your password.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your account details and security.</p>
      </div>

      {/* Details */}
      <div className="card-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Account details
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Full name</dt>
            <dd className="font-medium text-slate-900">{user.fullName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Mobile</dt>
            <dd className="font-medium text-slate-900">{user.phone}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Email status</dt>
            <dd>
              <Badge tone={user.emailVerified ? 'success' : 'warning'}>
                {user.emailVerified ? 'Verified' : 'Not verified'}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Member since</dt>
            <dd className="text-slate-900">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Password */}
      <div className="card-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Change password
        </h2>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        {success && (
          <div className="mt-4">
            <Alert tone="success">{success}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="currentPassword" className="field-label">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="field-label">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <p className="field-hint">
              At least 10 characters, with upper and lower case, a number and a symbol.
            </p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="field-label">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && !passwordsMatch && (
              <p className="field-error">The passwords do not match.</p>
            )}
          </div>
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            Update password
          </Button>
        </form>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
