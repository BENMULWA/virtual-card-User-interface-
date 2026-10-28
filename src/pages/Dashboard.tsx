/**
 * Dashboard.tsx - the customer's application home.
 *
 * Shows the live journey, the current step with a call to action, and quick
 * access to the card, wallet and KYC screens.
 */

import { useNavigate } from 'react-router-dom'

import { JourneyProgress, JourneyStepper, JourneySummaryCard } from '@/components/JourneyStepper'
import { Alert, Badge, Button, Skeleton } from '@/components/ui'
import { useJourney } from '@/hooks/useJourney'
import type { JourneyStep } from '@/api/types'

/** Where the "Continue" button should take the user for each step. */
function stepRoute(step: JourneyStep): string {
  switch (step.key) {
    case 'ACCOUNT':
      return '/profile'
    case 'VERIFY_EMAIL':
      return '/verify-email'
    case 'KYC_DOCUMENTS':
      return '/kyc/documents'
    case 'KYC_SUBMISSION':
      return '/kyc/details'
    case 'KYC_REVIEW':
      return '/dashboard'
    case 'CARD_ISSUANCE':
      return '/kyc/details?issue=1'
    case 'FUNDING':
      return '/wallet'
    default:
      return '/dashboard'
  }
}

function stepActionLabel(step: JourneyStep): string {
  switch (step.key) {
    case 'VERIFY_EMAIL':
      return 'Resend verification email'
    case 'KYC_DOCUMENTS':
      return 'Upload documents'
    case 'KYC_SUBMISSION':
      return 'Enter my KYC details'
    case 'KYC_REVIEW':
      return 'Check status'
    case 'CARD_ISSUANCE':
      return 'Request my card'
    case 'FUNDING':
      return 'Fund my card'
    default:
      return 'Continue'
  }
}

function holderStatusTone(status: string | null): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'pass_audit':
      return 'success'
    case 'reject':
      return 'error'
    case 'wait_audit':
    case 'under_review':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function Dashboard() {
  const navigate = useNavigate()
  const { journey, loading, error, live, refresh } = useJourney(true)

  if (loading && !journey) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error && !journey) {
    return (
      <Alert
        tone="error"
        title="We could not load your application"
        action={
          <Button size="sm" variant="secondary" onClick={() => void refresh()}>
            Try again
          </Button>
        }
      >
        {error}
      </Alert>
    )
  }

  if (!journey) return null

  const current = journey.steps.find((s) => s.key === journey.currentStep) ?? null
  const approved = journey.holder?.status === 'pass_audit'
  const rejected = journey.holder?.status === 'reject'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Your card application
          </h1>
          {approved && <Badge tone="success">Approved</Badge>}
          {rejected && <Badge tone="error">Action needed</Badge>}
          {journey.holder && !approved && !rejected && (
            <Badge tone="warning">Under review</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          We will keep this page up to date. You do not need to refresh.
        </p>
      </div>

      {/* Progress + summary */}
      <div className="card-surface p-5">
        <JourneyProgress
          progress={journey.progress}
          completedSteps={journey.completedSteps}
          totalSteps={journey.totalSteps}
          live={live}
        />
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm leading-relaxed text-slate-700">{journey.summary}</p>
        </div>
      </div>

      {rejected && (
        <Alert
          tone="error"
          title="Your KYC was not approved"
          action={
            <Button size="sm" onClick={() => navigate('/kyc/details?fix=1')}>
              Correct my details and resubmit
            </Button>
          }
        >
          {journey.holder?.description ??
            'Check your details and submit again. Our compliance team will take another look.'}
        </Alert>
      )}

      {current?.key === 'KYC_REVIEW' && (
        <Alert
          tone="info"
          title="Wasabi's compliance team is reviewing your application"
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/kyc/details')}>
              Escalate if it is taking too long
            </Button>
          }
        >
          We will update this page the moment the status changes. Usually this takes a few
          hours. If it has been more than a day, raise a ticket and we will chase it.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stepper */}
        <div className="lg:col-span-2">
          <div className="card-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Application steps
            </h2>
            <div className="mt-6">
              <JourneyStepper
                steps={journey.steps}
                currentStep={journey.currentStep}
                onAction={(step) => navigate(stepRoute(step))}
                actionLabel={stepActionLabel}
              />
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <JourneySummaryCard summary="Where you are right now">
            <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Email</dt>
                <dd>
                  <Badge tone={journey.emailVerified ? 'success' : 'warning'}>
                    {journey.emailVerified ? 'Verified' : 'Not verified'}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Documents</dt>
                <dd className="font-medium text-slate-900">
                  {journey.kycDocuments.length}/3 uploaded
                </dd>
              </div>
              {journey.holder && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">KYC review</dt>
                  <dd>
                    <Badge tone={holderStatusTone(journey.holder.status)}>
                      {journey.holder.status ?? 'Unknown'}
                    </Badge>
                  </dd>
                </div>
              )}
              {journey.holder?.statusFlowLocation && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Reviewed by</dt>
                  <dd className="text-right text-xs text-slate-600">
                    {journey.holder.statusFlowLocation === 'admin'
                      ? 'Wasabi platform'
                      : 'Issuing bank'}
                  </dd>
                </div>
              )}
              {journey.card && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Card</dt>
                  <dd className="font-mono text-xs text-slate-700">{journey.card.cardNo}</dd>
                </div>
              )}
            </dl>
          </JourneySummaryCard>

          {/* Quick actions */}
          <div className="card-surface p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quick actions
            </h3>
            <div className="mt-4 space-y-2">
              {journey.kycDocuments.length < 3 && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate('/kyc/documents')}
                >
                  Upload KYC documents
                </Button>
              )}
              {approved && !journey.card && (
                <Button fullWidth onClick={() => navigate('/kyc/details?issue=1')}>
                  Request my card
                </Button>
              )}
              {journey.card && (
                <Button variant="secondary" fullWidth onClick={() => navigate('/cards')}>
                  View my cards
                </Button>
              )}
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/wallet')}
              >
                Top up my wallet
              </Button>
            </div>
          </div>

          {/* Live activity */}
          {journey.card && (
            <div className="card-surface p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your card
              </h3>
              <p className="mt-3 font-mono text-lg font-semibold tracking-wider text-slate-900">
                •••• {journey.card.cardNo?.slice(-4) ?? '----'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={journey.card.blocked ? 'error' : 'success'}>
                  {journey.card.status ?? 'Unknown'}
                </Badge>
                {journey.funded && <Badge tone="brand">Funded</Badge>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
