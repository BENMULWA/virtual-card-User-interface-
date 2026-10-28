/**
 * Layout.tsx - the application shell: header, navigation, content area.
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { LiveIndicator } from './JourneyStepper'
import { Button } from './ui'

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        M
      </span>
      <span className="text-base font-semibold tracking-tight text-slate-900">Mamlaka</span>
    </span>
  )
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Application' },
  { to: '/cards', label: 'My cards' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/profile', label: 'Profile' },
]

export function Layout({ live, children }: { live?: boolean; children?: ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {live !== undefined && <LiveIndicator live={live} />}
            {user && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-slate-900">
                  {user.fullName}
                </p>
                <p className="text-xs leading-tight text-slate-500">{user.email}</p>
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-200 px-4 py-2 sm:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children ?? <Outlet />}
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <p className="text-xs text-slate-500">
            Mamlaka Virtual Cards &middot; Cards are issued by our partner processor. Card
            availability and eligibility are subject to compliance review.
          </p>
        </div>
      </footer>
    </div>
  )
}

/** Full-screen wrapper for the pages that have no navigation (login, register). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="px-4 py-6 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 py-6 text-center sm:px-8">
        <p className="text-xs text-slate-500">&copy; Mamlaka. All rights reserved.</p>
      </footer>
    </div>
  )
}
