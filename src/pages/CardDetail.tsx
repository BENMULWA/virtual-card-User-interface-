/**
 * CardDetail.tsx - one card: balance, controls, and the sensitive details.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { cards, wallet } from '@/api/api'
import type { PriceQuote } from '@/api/types'
import { Alert, Badge, Button, Modal, Spinner, Stat } from '@/components/ui'

type CardInfo = {
  cardNo?: string
  cardTypeId?: number
  cardBankBin?: string
  status?: string
  blocked?: boolean
  bindTime?: number
  balanceInfo?: { amount?: number; usedAmount?: number; currency?: string }
  holderInfo?: Record<string, string>
  noPinPaymentAmount?: number
}

// Freeze / unfreeze / cancel / deposit / withdraw finish asynchronously at Wasabi, so after one we
// re-read the card until something changes (or give up and tell the user it is still processing).
const WATCH_EVERY_MS = 3_000
const WATCH_ATTEMPTS = 10
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

type Pending = { action: 'cancel' | 'deposit' | 'withdraw'; title: string; body: string }

export function CardDetail() {
  const { cardNo = '' } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState<CardInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [showSensitive, setShowSensitive] = useState(false)
  const [sensitive, setSensitive] = useState<{
    cardNumber: string
    cvv: string
    expireDate: string
  } | null>(null)
  const [amount, setAmount] = useState('10')
  const [fundQuote, setFundQuote] = useState<PriceQuote | null>(null)
  const [withdrawQuote, setWithdrawQuote] = useState<PriceQuote | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const watchRef = useRef<number | null>(null)
  const infoRef = useRef<CardInfo | null>(null)
  infoRef.current = info

  const load = useCallback(async () => {
    try {
      const result = await cards.info(cardNo)
      setInfo((result.data ?? {}) as CardInfo)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not load this card.')
    } finally {
      setLoading(false)
    }
  }, [cardNo])

  useEffect(() => {
    void load()
  }, [load])

  const stopWatching = useCallback(() => {
    if (watchRef.current) window.clearTimeout(watchRef.current)
    watchRef.current = null
  }, [])
  useEffect(() => stopWatching, [stopWatching])

  const watchForChange = useCallback(() => {
    const signature = (c: CardInfo | null) => `${c?.status}|${c?.balanceInfo?.amount}`
    const before = signature(infoRef.current)
    let attempts = 0
    setProcessing(true)
    const tick = async () => {
      attempts += 1
      try {
        const result = await cards.info(cardNo)
        const next = (result.data ?? {}) as CardInfo
        setInfo(next)
        if (signature(next) !== before) {
          setProcessing(false)
          return
        }
      } catch {
        // keep trying; the next tick or the reconcile job will catch up
      }
      if (attempts >= WATCH_ATTEMPTS) {
        setProcessing(false)
        setNotice('Still processing with the card issuer. This page will show the result when it lands - you can leave and come back.')
        return
      }
      watchRef.current = window.setTimeout(() => void tick(), WATCH_EVERY_MS)
    }
    stopWatching()
    watchRef.current = window.setTimeout(() => void tick(), WATCH_EVERY_MS)
  }, [cardNo, stopWatching])

  // Price the amount in KES (same maths the backend charges) as the user types.
  const amountValid = AMOUNT_RE.test(amount) && Number(amount) > 0
  useEffect(() => {
    if (!amountValid || !info?.cardTypeId) {
      setFundQuote(null)
      setWithdrawQuote(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const [fund, out] = await Promise.all([
          wallet.quote(amount, 'fund', info.cardTypeId),
          wallet.quote(amount, 'withdraw', info.cardTypeId),
        ])
        if (!cancelled) {
          setFundQuote(fund)
          setWithdrawQuote(out)
        }
      } catch {
        if (!cancelled) {
          setFundQuote(null)
          setWithdrawQuote(null)
        }
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [amount, amountValid, info?.cardTypeId])

  const run = async (action: string, fn: () => Promise<unknown>) => {
    setBusy(action)
    setError(null)
    setNotice(null)
    try {
      const result = (await fn()) as { status?: string } | undefined
      await load()
      if (result?.status === 'UNKNOWN') {
        setNotice('We could not confirm that with the card issuer yet. Do not repeat it - we are checking and this page will update.')
      }
      if (result?.status !== 'SUCCESS') watchForChange()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That action failed. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const revealSensitive = async () => {
    setBusy('sensitive')
    try {
      const result = await cards.sensitive(cardNo)
      setSensitive(result.data)
      setShowSensitive(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not reveal the card details.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  if (!info) {
    return (
      <Alert
        tone="error"
        action={
          <Button size="sm" variant="secondary" onClick={() => navigate('/cards')}>
            Back to my cards
          </Button>
        }
      >
        {error ?? 'Card not found.'}
      </Alert>
    )
  }

  const balance = Number(info.balanceInfo?.amount ?? 0)
  const currency = info.balanceInfo?.currency ?? 'USD'
  const isFrozen = info.status === 'Freeze'
  const isCancelled = info.status === 'cancel' || info.status === 'fail'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Card •••• {cardNo.slice(-4)}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {info.cardBankBin && <span>BIN {info.cardBankBin}</span>}
            <Badge tone={info.blocked ? 'error' : isCancelled ? 'error' : 'success'}>
              {info.status ?? 'Unknown'}
            </Badge>
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/cards')}>
          All cards
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="warning">{notice}</Alert>}
      {processing && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" /> Processing with the card issuer - this usually takes a few seconds.
          </span>
        </Alert>
      )}

      {/* Card visual */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {info.cardTypeId ? `Type ${info.cardTypeId}` : 'Virtual card'}
              </span>
              {info.blocked && <Badge tone="error">Blocked</Badge>}
            </div>
            <p className="mt-10 font-mono text-xl tracking-[0.2em]">
              •••• •••• •••• {cardNo.slice(-4)}
            </p>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Balance</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                  {currency} {balance.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Currency</p>
                <p className="mt-0.5 text-sm font-medium">{currency}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Available" value={`${balance.toFixed(2)} ${currency}`} tone="brand" />
            <Stat
              label="Status"
              value={info.status ?? 'Unknown'}
              sub={info.blocked ? 'Blocked by the issuer' : undefined}
            />
          </div>

          {/* Controls */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Card controls
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                loading={busy === 'freeze'}
                disabled={isFrozen || isCancelled}
                onClick={() => void run('freeze', () => cards.freeze(cardNo))}
              >
                {isFrozen ? 'Frozen' : 'Freeze card'}
              </Button>
              <Button
                variant="secondary"
                loading={busy === 'unfreeze'}
                disabled={!isFrozen || isCancelled}
                onClick={() => void run('unfreeze', () => cards.unfreeze(cardNo))}
              >
                Unfreeze card
              </Button>
              <Button
                variant="secondary"
                loading={busy === 'sensitive'}
                onClick={() => void revealSensitive()}
              >
                Show card details
              </Button>
              <Button
                variant="danger"
                loading={busy === 'cancel'}
                disabled={isCancelled}
                onClick={() =>
                  setPending({
                    action: 'cancel',
                    title: 'Cancel this card?',
                    body: `Card •••• ${cardNo.slice(-4)} will be permanently cancelled. This cannot be undone.`,
                  })
                }
              >
                Cancel card
              </Button>
            </div>
          </div>

          {/* Funding */}
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Fund this card
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Move money from your Mamlaka wallet onto this card.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="amount" className="field-label">
                  Amount (USD)
                </label>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  aria-invalid={!amountValid}
                  className="field-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button
                loading={busy === 'deposit'}
                disabled={!amountValid || isCancelled || processing}
                onClick={() =>
                  setPending({
                    action: 'deposit',
                    title: `Deposit ${amount} USD?`,
                    body: fundQuote
                      ? `${fundQuote.kes} KES will be taken from your wallet (rate ${fundQuote.rate} KES/USD).`
                      : 'The amount will be taken from your wallet.',
                  })
                }
              >
                Deposit
              </Button>
              <Button
                variant="secondary"
                loading={busy === 'withdraw'}
                disabled={!amountValid || isCancelled || processing}
                onClick={() =>
                  setPending({
                    action: 'withdraw',
                    title: `Withdraw ${amount} USD?`,
                    body: withdrawQuote
                      ? `${withdrawQuote.kes} KES will be returned to your wallet (rate ${withdrawQuote.rate} KES/USD).`
                      : 'The amount will be returned to your wallet.',
                  })
                }
              >
                Withdraw
              </Button>
            </div>
            {amount !== '' && !amountValid && (
              <p className="mt-2 text-xs text-red-600">Enter an amount above 0 with at most 2 decimals.</p>
            )}
            {amountValid && fundQuote && withdrawQuote && (
              <p className="mt-2 text-xs text-slate-500">
                Deposit costs about {fundQuote.kes} KES; withdrawing returns about {withdrawQuote.kes} KES.
              </p>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.title ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Go back
            </Button>
            <Button
              variant={pending?.action === 'cancel' ? 'danger' : 'primary'}
              onClick={() => {
                const p = pending
                setPending(null)
                if (!p) return
                if (p.action === 'cancel') void run('cancel', () => cards.cancel(cardNo))
                if (p.action === 'deposit') void run('deposit', () => cards.deposit(cardNo, amount))
                if (p.action === 'withdraw') void run('withdraw', () => cards.withdraw(cardNo, amount))
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{pending?.body}</p>
      </Modal>

      <Modal
        open={showSensitive}
        onClose={() => {
          setShowSensitive(false)
          setSensitive(null) // do not keep the PAN/CVV in memory once the user is done
        }}
        title="Card details"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setShowSensitive(false)
              setSensitive(null)
            }}
          >
            Close
          </Button>
        }
      >
        {sensitive && (
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Card number
              </dt>
              <dd className="mt-1 font-mono text-lg tracking-wider text-slate-900">
                {sensitive.cardNumber}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">CVV</dt>
                <dd className="mt-1 font-mono text-lg text-slate-900">{sensitive.cvv}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Expires
                </dt>
                <dd className="mt-1 font-mono text-lg text-slate-900">{sensitive.expireDate}</dd>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Keep these details private. Never share them with anyone.
            </p>
          </dl>
        )}
      </Modal>
    </div>
  )
}
