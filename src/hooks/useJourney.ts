/**
 * useJourney.ts - the live application state.
 *
 * Two sources, deliberately:
 *  1. A poll every 20s. Works everywhere, survives a proxy that kills SSE.
 *  2. A Server-Sent Events stream. Pushes updates the moment Wasabi's webhook
 *     arrives, so the user sees the approval without refreshing.
 *
 * If the SSE stream drops, the poll keeps the UI correct.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { journey } from '@/api/api'
import { API_BASE, getToken } from '@/api/client'
import type { Journey } from '@/api/types'

const POLL_INTERVAL_MS = 20_000
const STREAM_RETRY_MS = 5_000

export interface JourneyState {
  journey: Journey | null
  loading: boolean
  error: string | null
  live: boolean
  lastReason: string | null
  refresh: () => Promise<void>
}

export function useJourney(enabled: boolean): JourneyState {
  const [data, setData] = useState<Journey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [lastReason, setLastReason] = useState<string | null>(null)
  const retryRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const result = await journey.get()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your application status.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // Initial load + polling.
  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [enabled, refresh])

  // Live stream.
  useEffect(() => {
    if (!enabled) return
    const token = getToken()
    if (!token) return

    let source: EventSource | null = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      // EventSource cannot set headers, so the token goes in the query string.
      const url = `${API_BASE}/api/v1/journey/stream?token=${encodeURIComponent(token)}`
      source = new EventSource(url)

      source.addEventListener('journey', (event) => {
        try {
          const parsed = JSON.parse((event as MessageEvent).data) as {
            reason?: string
            journey?: Journey
          }
          if (parsed.journey) setData(parsed.journey)
          if (parsed.reason) setLastReason(parsed.reason)
          setLive(true)
          setError(null)
        } catch {
          // A malformed frame should not kill the stream.
        }
      })

      source.onopen = () => setLive(true)

      source.onerror = () => {
        setLive(false)
        source?.close()
        if (!cancelled) {
          retryRef.current = window.setTimeout(connect, STREAM_RETRY_MS)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (retryRef.current) window.clearTimeout(retryRef.current)
      source?.close()
      setLive(false)
    }
  }, [enabled])

  return { journey: data, loading, error, live, lastReason, refresh }
}
