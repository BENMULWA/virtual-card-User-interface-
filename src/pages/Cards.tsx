/**
 * Cards.tsx - the customer's cards.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { cards } from '@/api/api'
import { Alert, Badge, Button, EmptyState, Skeleton } from '@/components/ui'
import type { MyCard } from '@/api/types'

function statusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'Normal':
      return 'success'
    case 'pending':
    case 'un_activated':
    case 'Freezing':
    case 'UnFreezing':
    case 'canceling':
      return 'warning'
    case 'cancel':
    case 'fail':
    case 'blocked':
      return 'error'
    default:
      return 'neutral'
  }
}

export function Cards() {
  const navigate = useNavigate()
  const [myCards, setMyCards] = useState<MyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const result = await cards.myCards()
      setMyCards(result.records ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not load your cards.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My cards</h1>
          <p className="mt-1 text-sm text-slate-500">
            {myCards.length === 0
              ? 'You do not have any cards yet.'
              : `${myCards.length} card${myCards.length === 1 ? '' : 's'} on your account.`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {myCards.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={
              <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.5" />
                <path d="M2 10h20" strokeWidth="1.5" />
              </svg>
            }
            title="No cards yet"
            description="Finish your identity check and request a virtual card to get started."
            action={
              <Button onClick={() => navigate('/dashboard')}>Go to my application</Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myCards.map((card) => (
            <Link
              key={card.card_no}
              to={`/cards/${encodeURIComponent(card.card_no)}`}
              className="group rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-5 text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Virtual card
                </span>
                <Badge tone={statusTone(card.status)}>{card.status}</Badge>
              </div>
              <p className="mt-8 font-mono text-lg tracking-[0.2em]">
                •••• •••• •••• {card.card_no.slice(-4)}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Issued {new Date(card.created_at ?? Date.now()).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
