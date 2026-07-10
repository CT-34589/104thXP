import { DevRankTool } from '@/components/dev-rank-tool'
import { LeaderboardTable, StatsBar } from '@/components/leaderboard'
import { RankLegend } from '@/components/rank-legend'
import { useLeaderboard } from '@/hooks/use-leaderboard'
import { useState } from 'react'
import battalionLogo from '@/assets/104th-battalion-logo.png'

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '')

  if (path.endsWith('/dev/ranks')) {
    return <DevRankTool />
  }

  return <LeaderboardPage />
}

function LeaderboardPage() {
  const { data, loading, error } = useLeaderboard()
  const [memberSearch, setMemberSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<'all' | 'pc' | 'ps' | 'xbox'>('all')

  return (
    <div className="site-shell min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0c0f15]/88 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2.5 px-4 sm:h-16 sm:px-6 lg:px-8">
          <img
            src={battalionLogo}
            alt="104th Battalion"
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-[0_0_18px_rgba(91,130,175,.25)]"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-[0.12em] text-white sm:text-base">
              104th Battalion
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] sm:text-xs">
              XP Leaderboard
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-xs font-bold text-[var(--color-muted-foreground)] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-rank-seasoned)] shadow-[0_0_8px_#22c55e]" />
            Live standings
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.065] to-white/[0.015] px-5 py-5 shadow-2xl shadow-black/20 sm:px-6 sm:py-6">
          <h1 className="max-w-3xl text-2xl font-black uppercase leading-none tracking-tight text-white sm:text-3xl">
            Battalion standings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--color-muted-foreground)]">
            Track xp progression across the 104th.
          </p>
        </div>

        <StatsBar
          playerCount={data?.players.length ?? 0}
          lastUpdated={data?.lastUpdated ?? null}
          error={error}
          memberSearch={memberSearch}
          onMemberSearchChange={setMemberSearch}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
        />

        {error && !data && (
          <div className="rounded-lg border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-4 py-3 text-sm">
            Could not load leaderboard data. Ensure{' '}
            <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-xs">
              public/data/leaderboard.json
            </code>{' '}
            exists and your bot is pushing updates.
          </div>
        )}

        {data && data.players.length > 0 ? (
          <LeaderboardTable
            players={data.players}
            memberSearch={memberSearch}
            platformFilter={platformFilter}
          />
        ) : !loading && !error ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <p className="text-lg font-medium">No troopers on the board yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Your bot should write player data to leaderboard.json
            </p>
          </div>
        ) : null}

        <RankLegend />
      </main>

      <footer className="border-t border-white/8 bg-black/20 px-4 py-6 text-center text-xs text-[var(--color-muted-foreground)]">
        104th Battalion Milsim · Ranked ladder · Updates every 60 seconds
      </footer>
    </div>
  )
}
