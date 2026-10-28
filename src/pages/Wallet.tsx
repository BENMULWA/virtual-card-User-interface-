/**
 * Wallet.tsx - M-Pesa top-up and balance.
 */

import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '@/api/client'
import { wallet } from '@/api/api'
import { Alert, Badge, Button, Spinner, Stat } from '@/components/ui'
import type { Topup, WalletBalance } from '@/api/types'

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000]

export function Wallet() {
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('1000')
  const [submitting, setSubmitting] = useState(false)
  const [topup, setTopup] = useState<Topup | null>(null)
  const [checking, setChecking] = useState(false)

  const load = useCallback(async () => {
    try {
      setBalance(await wallet.balance())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not load your balance.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const startTopup = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const result = await wallet.topup(phone.trim(), Number(amount))
      setTopup(result)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not start the M-Pesa payment. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const checkStatus = async () => {
    if (!topup) return
    setChecking(true)
    try {
      const result = await wallet.topupStatus(topup.checkout_request_id, true)
      setTopup(result)
      if (result.status === 'SUCCESS') await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not check the payment status.')
    } finally {
      setChecking(false)
    }
  }

  // Poll the payment status while a prompt is open.
  useEffect(() => {
    if (!topup || topup.status !== 'PENDING') return
    const timer = window.setInterval(() => void checkStatus(), 5000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topup?.status, topup?.checkout_request_id])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My wallet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Top up with M-Pesa, then move money onto your virtual card.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Available"
          value={`KES ${Number(balance?.available ?? 0).toFixed(2)}`}
          tone="brand"
        />
        <Stat label="On hold" value={`KES ${Number(balance?.held ?? 0).toFixed(2)}`} />
        <Stat label="Currency" value={balance?.currency ?? 'KES'} />
      </div>

      {/* Top-up form */}
      {!topup && (
        <div className="card-surface p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Top up with M-Pesa
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            You will get a payment prompt on your phone. Approve it to complete the top-up.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="phone" className="field-label">
                Safaricom number
              </label>
              <input
                id="phone"
                type="tel"
                className="field-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
              />
              <p className="field-hint">We will send the STK prompt to this number.</p>
            </div>

            <div>
              <label htmlFor="amount" className="field-label">
                Amount (KES)
              </label>
              <input
                id="amount"
                type="number"
                min="10"
                step="1"
                className="field-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((value) => (
                  <Button
                    key={value}
                    variant={amount === String(value) ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAmount(String(value))}
                  >
                    {value.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              fullWidth
              loading={submitting}
              disabled={!phone.trim() || !amount}
              onClick={() => void startTopup()}
            >
              Send payment prompt
            </Button>
          </div>
        </div>
      )}

      {/* Payment status */}
      {topup && (
        <div className="card-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Payment status
            </h2>
            <Badge
              tone={
                topup.status === 'SUCCESS'
                  ? 'success'
                  : topup.status === 'FAILED'
                    ? 'error'
                    : topup.status === 'REVIEW'
                      ? 'warning'
                      : 'info'
              }
            >
              {topup.status}
            </Badge>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-medium text-slate-900">KES {topup.amount_kes}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-slate-900">{topup.phone_masked}</dd>
            </div>
            {topup.mpesa_receipt && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Receipt</dt>
                <dd className="font-mono text-xs text-slate-900">{topup.mpesa_receipt}</dd>
              </div>
            )}
            {topup.result_desc && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Details</dt>
                <dd className="text-right text-slate-900">{topup.result_desc}</dd>
              </div>
            )}
          </dl>

          {topup.status === 'PENDING' && (
            <div className="mt-4">
              <Alert tone="info">
                Waiting for you to approve the payment on your phone. This page updates
                automatically.
              </Alert>
              <Button
                variant="secondary"
                className="mt-3"
                loading={checking}
                onClick={() => void checkStatus()}
              >
                Check now
              </Button>
            </div>
          )}

          {topup.status === 'SUCCESS' && (
            <div className="mt-4">
              <Alert tone="success">
                Your wallet has been credited. You can now move the money onto your card.
              </Alert>
            </div>
          )}

          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setTopup(null)
              void load()
            }}
          >
            Start another top-up
          </Button>
        </div>
      )}
    </div>
  )
}
