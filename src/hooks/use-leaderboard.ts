import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeaderboardData } from '@/types/leaderboard'

const POLL_INTERVAL_MS = 60_000
const DEFAULT_LEADERBOARD_URL =
  'https://leaderboard.104thbattalionmilsim.com/api/leaderboard'

const leaderboardUrl = import.meta.env.VITE_LEADERBOARD_URL ?? DEFAULT_LEADERBOARD_URL

interface UseLeaderboardResult {
  data: LeaderboardData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => void
}

export function useLeaderboard(): UseLeaderboardResult {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasData = useRef(false)
  const lastPayload = useRef('')
  const requestInFlight = useRef(false)

  const fetchData = useCallback(async (showIndicator = false) => {
    if (requestInFlight.current) return
    requestInFlight.current = true
    if (showIndicator && hasData.current) setRefreshing(true)

    try {
      const url = `${leaderboardUrl}?t=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load leaderboard (${res.status})`)
      const payload = await res.text()

      if (payload !== lastPayload.current) {
        const json = JSON.parse(payload) as LeaderboardData
        setData(json)
        lastPayload.current = payload
        hasData.current = true
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      if (showIndicator) setRefreshing(false)
      requestInFlight.current = false
    }
  }, [])

  useEffect(() => {
    void fetchData(false)
    const id = setInterval(() => void fetchData(false), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchData])

  const refresh = useCallback(() => {
    void fetchData(true)
  }, [fetchData])

  return { data, loading, refreshing, error, refresh }
}
