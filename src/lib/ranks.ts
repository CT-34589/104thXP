export type RankTier =
  | 'shiny'
  | 'trooper'
  | 'seasoned'
  | 'veteran'
  | 'elite'
  | 'vanguard'
  | 'legend'
  | 'padawan'
  | 'knight'
  | 'master'
  | 'grand-master'

export interface RankConfig {
  tier: RankTier
  label: string
  minLevel: number
  maxLevel: number | null
  levelRange: string
  color: string
  glow: string
  textClass: string
  borderClass: string
  bgClass: string
}

const XP_THRESHOLD = 2_250_000
const XP_POST_30_STEP = 147_500

export const RANKS: RankConfig[] = [
  {
    tier: 'shiny',
    label: 'Shiny',
    minLevel: 0,
    maxLevel: 9,
    levelRange: '0–9',
    color: '#9ca3af',
    glow: 'rgba(156, 163, 175, 0.35)',
    textClass: 'text-[var(--color-rank-shiny)]',
    borderClass: 'border-[var(--color-rank-shiny)]/40',
    bgClass: 'bg-[var(--color-rank-shiny)]/10',
  },
  {
    tier: 'trooper',
    label: 'Trooper',
    minLevel: 10,
    maxLevel: 19,
    levelRange: '10–19',
    color: '#d1d5db',
    glow: 'rgba(209, 213, 219, 0.35)',
    textClass: 'text-[var(--color-rank-trooper)]',
    borderClass: 'border-[var(--color-rank-trooper)]/40',
    bgClass: 'bg-[var(--color-rank-trooper)]/10',
  },
  {
    tier: 'seasoned',
    label: 'Seasoned',
    minLevel: 20,
    maxLevel: 29,
    levelRange: '20–29',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.35)',
    textClass: 'text-[var(--color-rank-seasoned)]',
    borderClass: 'border-[var(--color-rank-seasoned)]/40',
    bgClass: 'bg-[var(--color-rank-seasoned)]/10',
  },
  {
    tier: 'veteran',
    label: 'Veteran',
    minLevel: 30,
    maxLevel: 39,
    levelRange: '30–39',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.35)',
    textClass: 'text-[var(--color-rank-veteran)]',
    borderClass: 'border-[var(--color-rank-veteran)]/40',
    bgClass: 'bg-[var(--color-rank-veteran)]/10',
  },
  {
    tier: 'elite',
    label: 'Elite',
    minLevel: 40,
    maxLevel: 49,
    levelRange: '40–49',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)',
    textClass: 'text-[var(--color-rank-elite)]',
    borderClass: 'border-[var(--color-rank-elite)]/40',
    bgClass: 'bg-[var(--color-rank-elite)]/10',
  },
  {
    tier: 'vanguard',
    label: 'Vanguard',
    minLevel: 50,
    maxLevel: 59,
    levelRange: '50–59',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.35)',
    textClass: 'text-[var(--color-rank-vanguard)]',
    borderClass: 'border-[var(--color-rank-vanguard)]/40',
    bgClass: 'bg-[var(--color-rank-vanguard)]/10',
  },
  {
    tier: 'legend',
    label: 'Legend',
    minLevel: 60,
    maxLevel: 69,
    levelRange: '60–69',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    textClass: 'text-[var(--color-rank-legend)]',
    borderClass: 'border-[var(--color-rank-legend)]/40',
    bgClass: 'bg-[var(--color-rank-legend)]/10',
  },
  {
    tier: 'padawan',
    label: 'Padawan',
    minLevel: 70,
    maxLevel: 79,
    levelRange: '70–79',
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.35)',
    textClass: 'text-[var(--color-rank-padawan)]',
    borderClass: 'border-[var(--color-rank-padawan)]/40',
    bgClass: 'bg-[var(--color-rank-padawan)]/10',
  },
  {
    tier: 'knight',
    label: 'Knight',
    minLevel: 80,
    maxLevel: 89,
    levelRange: '80–89',
    color: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.35)',
    textClass: 'text-[var(--color-rank-knight)]',
    borderClass: 'border-[var(--color-rank-knight)]/40',
    bgClass: 'bg-[var(--color-rank-knight)]/10',
  },
  {
    tier: 'master',
    label: 'Master',
    minLevel: 90,
    maxLevel: 149,
    levelRange: '90–149',
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.35)',
    textClass: 'text-[var(--color-rank-master)]',
    borderClass: 'border-[var(--color-rank-master)]/40',
    bgClass: 'bg-[var(--color-rank-master)]/10',
  },
  {
    tier: 'grand-master',
    label: 'Grand Master',
    minLevel: 150,
    maxLevel: null,
    levelRange: '150+',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    textClass: 'text-[var(--color-rank-grand-master)]',
    borderClass: 'border-[var(--color-rank-grand-master)]/40',
    bgClass: 'bg-[var(--color-rank-grand-master)]/10',
  },
]

/** Level from total XP */
export function getLevelFromXp(xp: number): number {
  if (xp < XP_THRESHOLD) {
    return Math.floor((-1 + Math.sqrt(1 + xp / 625)) / 2)
  }
  return 30 + Math.floor((xp - XP_THRESHOLD) / XP_POST_30_STEP)
}

/** Minimum XP required to reach a given level */
export function getXpForLevel(level: number): number {
  if (level <= 0) return 0
  if (level < 30) return 2500 * level * (level + 1)
  return XP_THRESHOLD + (level - 30) * XP_POST_30_STEP
}

export function getRankForLevel(level: number): RankConfig {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const rank = RANKS[i]
    if (level >= rank.minLevel && (rank.maxLevel === null || level <= rank.maxLevel)) {
      return rank
    }
  }
  return RANKS[0]
}

export function getRankForXp(xp: number): RankConfig {
  return getRankForLevel(getLevelFromXp(xp))
}

export function getRankByTier(tier: RankTier): RankConfig {
  return RANKS.find((r) => r.tier === tier) ?? RANKS[0]
}

export function getNextRank(level: number): RankConfig | null {
  const current = getRankForLevel(level)
  const idx = RANKS.findIndex((r) => r.tier === current.tier)
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null
}

export function getLevelProgress(xp: number): number {
  const level = getLevelFromXp(xp)
  const currentXp = getXpForLevel(level)
  const nextXp = getXpForLevel(level + 1)
  const range = nextXp - currentXp
  if (range <= 0) return 100
  return Math.min(100, Math.max(0, ((xp - currentXp) / range) * 100))
}

export function getXpToNextLevel(xp: number): number {
  const level = getLevelFromXp(xp)
  return getXpForLevel(level + 1) - xp
}
