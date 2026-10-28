/**
 * Landing.tsx - the public front door.
 */

import { Link } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

const STEPS = [
  {
    title: 'Create your account',
    body: 'Two minutes. Just your email, phone number and a password.',
  },
  {
    title: 'Upload three documents',
    body: 'The front and back of your ID, plus a photo of you holding it.',
  },
  {
    title: 'We verify your identity',
    body: 'Our compliance team reviews your submission, usually within a few hours.',
  },
  {
    title: 'Your card is ready',
    body: 'Top up with M-Pesa and start spending straight away.',
  },
]

export function Landing() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            M
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900">Mamlaka</span>
        </span>
        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Go to my application
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                Apply now
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
              Virtual cards for Kenyan businesses
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              A virtual card that takes five minutes to set up.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Apply online, track your application step by step, and fund your card with M-Pesa
              the moment it is approved. No branch visits, no paperwork.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="rounded-xl bg-brand-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                {isAuthenticated ? 'Go to my application' : 'Start my application'}
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              How it works
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <div key={step.title} className="card-surface p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl bg-slate-900 px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready when you are.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-300">
              Your application page updates live, so you always know exactly where you are and
              what happens next.
            </p>
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="mt-8 inline-block rounded-xl bg-brand-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-400"
            >
              {isAuthenticated ? 'Go to my application' : 'Apply for a card'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs text-slate-500">
            Mamlaka Virtual Cards. Cards are issued by our partner processor. Card availability
            and eligibility are subject to compliance review and the cardholder agreement.
          </p>
        </div>
      </footer>
    </div>
  )
}
