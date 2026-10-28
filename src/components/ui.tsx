/**
 * ui.tsx - the small set of reusable building blocks.
 * Deliberately plain: no component library, no runtime cost, full control.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'

// =========================================================
// Button
// =========================================================
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors
        disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

// =========================================================
// Spinner
// =========================================================
export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// =========================================================
// Alert
// =========================================================
type AlertTone = 'info' | 'success' | 'warning' | 'error'

const ALERT_TONES: Record<AlertTone, { box: string; icon: string; title: string }> = {
  info: {
    box: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: 'text-blue-500',
    title: 'text-blue-900',
  },
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-500',
    title: 'text-emerald-900',
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'text-amber-500',
    title: 'text-amber-900',
  },
  error: {
    box: 'border-red-200 bg-red-50 text-red-900',
    icon: 'text-red-500',
    title: 'text-red-900',
  },
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  action?: ReactNode
}) {
  const t = ALERT_TONES[tone]
  return (
    <div className={`rounded-xl border p-4 ${t.box}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="flex gap-3">
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${t.icon}`} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 3a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="min-w-0 flex-1">
          {title && <p className={`text-sm font-semibold ${t.title}`}>{title}</p>}
          {children && <div className="mt-1 text-sm leading-relaxed">{children}</div>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}

// =========================================================
// Badge
// =========================================================
type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  error: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ring-1 ring-inset ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

// =========================================================
// Empty state
// =========================================================
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// =========================================================
// Stat
// =========================================================
export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'brand'
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === 'brand' ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          tone === 'brand' ? 'text-brand-800' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

// =========================================================
// Skeleton
// =========================================================
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
}

// =========================================================
// Modal
// =========================================================
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
