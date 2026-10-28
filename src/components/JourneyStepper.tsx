/**
 * JourneyStepper.tsx - the application tracker.
 *
 * This is the heart of the user navigation: a vertical timeline of the seven
 * application steps, each showing what it is, whether it is done, and what the
 * user should do next.
 */

import type { ReactNode } from 'react'

import type { JourneyStep, StepStatus } from '@/api/types'
import { Button } from './ui'

const STATUS_META: Record<
  StepStatus,
  { label: string; dot: string; ring: string; text: string; badge: 'success' | 'info' | 'neutral' | 'error' }
> = {
  completed: {
    label: 'Done',
    dot: 'bg-brand-600',
    ring: 'ring-brand-100',
    text: 'text-slate-900',
    badge: 'success',
  },
  in_progress: {
    label: 'In progress',
    dot: 'bg-blue-500',
    ring: 'ring-blue-100',
    text: 'text-slate-900',
    badge: 'info',
  },
  pending: {
    label: 'To do',
    dot: 'bg-slate-300',
    ring: 'ring-slate-100',
    text: 'text-slate-500',
    badge: 'neutral',
  },
  blocked: {
    label: 'Needs attention',
    dot: 'bg-red-500',
    ring: 'ring-red-100',
    text: 'text-slate-900',
    badge: 'error',
  },
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ExclamationIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function JourneyStepper({
  steps,
  currentStep,
  onAction,
  actionLabel,
}: {
  steps: JourneyStep[]
  currentStep: string | null
  onAction?: (step: JourneyStep) => void
  actionLabel?: (step: JourneyStep) => string
}) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const meta = STATUS_META[step.status]
        const isCurrent = step.key === currentStep
        const isLast = index === steps.length - 1

        return (
          <li key={step.key} className="relative pb-8 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${
                  step.status === 'completed' ? 'bg-brand-200' : 'bg-slate-200'
                }`}
              />
            )}

            <div className="flex gap-4">
              {/* Marker */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ring-4 ${
                    meta.ring
                  } ${meta.dot} ${step.status === 'pending' ? 'ring-slate-50' : ''}`}
                >
                  {step.status === 'completed' && <CheckIcon />}
                  {step.status === 'in_progress' && <SpinnerIcon />}
                  {step.status === 'blocked' && <ExclamationIcon />}
                  {step.status === 'pending' && (
                    <span className="h-2 w-2 rounded-full bg-white/80" />
                  )}
                </span>
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-blue-400"
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={`text-sm font-semibold ${
                      step.status === 'pending' ? 'text-slate-500' : meta.text
                    }`}
                  >
                    {step.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                      step.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : step.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 ring-blue-200'
                          : step.status === 'blocked'
                            ? 'bg-red-50 text-red-700 ring-red-200'
                            : 'bg-slate-50 text-slate-500 ring-slate-200'
                    }`}
                  >
                    {meta.label}
                  </span>
                </div>

                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    step.status === 'pending' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.description}
                </p>

                {isCurrent && onAction && (
                  <div className="mt-3">
                    <Button size="sm" onClick={() => onAction(step)}>
                      {actionLabel ? actionLabel(step) : 'Continue'}
                    </Button>
                    <p className="mt-2 text-xs text-slate-400">
                      API: <code className="font-mono">{step.action}</code>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The progress bar shown at the top of the dashboard. */
export function JourneyProgress({
  progress,
  completedSteps,
  totalSteps,
  live,
}: {
  progress: number
  completedSteps: number
  totalSteps: number
  live: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-slate-700">
          {completedSteps} of {totalSteps} steps complete
        </p>
        <p className="text-sm font-semibold tabular-nums text-brand-700">{progress}%</p>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Application progress"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {live && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live - updates arrive automatically
        </p>
      )}
    </div>
  )
}

/** Small status pill used in the dashboard header. */
export function LiveIndicator({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-400'}`}
        aria-hidden="true"
      />
      {live ? 'Live' : 'Polling'}
    </span>
  )
}

export function JourneySummaryCard({
  summary,
  children,
}: {
  summary: string
  children?: ReactNode
}) {
  return (
    <div className="card-surface p-5">
      <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
      {children}
    </div>
  )
}
