import type { RankTier } from '@/lib/ranks'

export interface Player {
  id: string
  displayName: string
  callsign?: string
  /** Optional platform key used by leaderboard filters */
  platform?: 'pc' | 'ps' | 'xbox'
  xp: number
  /** Ignored — level is always derived from XP via the rank formula */
  level?: number
  /** Optional override for colour tier; normally derived from level */
  rank?: RankTier
  avatarUrl?: string
}

export interface LeaderboardData {
  lastUpdated: string
  season?: string
  players: Player[]
}
