/**
 * useAuth.tsx - the signed-in session.
 *
 * The token lives in localStorage so a refresh keeps you signed in, and the
 * user profile is re-fetched on mount so a suspended account is caught.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { auth } from '@/api/api'
import { ApiError, clearSession, getStoredUser, getToken, setStoredUser, setToken } from '@/api/client'
import type { User } from '@/api/types'

interface AuthState {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    fullName: string
    phone: string
    acceptedTerms: boolean
  }) => Promise<void>
  signOut: () => void
  refreshUser: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getStoredUser<User>())
  const [loading, setLoading] = useState<boolean>(() => Boolean(getToken()))

  const signOut = useCallback(() => {
    clearSession()
    setUserState(null)
  }, [])

  const setUser = useCallback((next: User) => {
    setUserState(next)
    setStoredUser(next)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUserState(null)
      return
    }
    try {
      const me = await auth.me()
      setUser(me)
    } catch (err) {
      // A 401 means the token is no longer valid - drop the session.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        signOut()
      }
    } finally {
      setLoading(false)
    }
  }, [setUser, signOut])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await auth.login({ email, password })
      setToken(result.access_token)
      setUser(result.user)
    },
    [setUser],
  )

  const signUp = useCallback(
    async (input: {
      email: string
      password: string
      fullName: string
      phone: string
      acceptedTerms: boolean
    }) => {
      const result = await auth.register(input)
      setToken(result.access_token)
      setUser(result.user)
    },
    [setUser],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && getToken()),
      signIn,
      signUp,
      signOut,
      refreshUser,
      setUser,
    }),
    [user, loading, signIn, signUp, signOut, refreshUser, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
