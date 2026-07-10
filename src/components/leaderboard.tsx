import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { RankBadge } from '@/components/rank-badge'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getLevelFromXp,
  getRankByTier,
  getRankForXp,
  getLevelProgress,
  getXpToNextLevel,
} from '@/lib/ranks'
import { cn } from '@/lib/utils'
import type { Player } from '@/types/leaderboard'

interface LeaderboardTableProps {
  players: Player[]
  memberSearch: string
  platformFilter: 'all' | 'pc' | 'ps' | 'xbox'
}

function getPlatformLabel(platform: Player['platform']) {
  if (platform === 'pc') return 'PC'
  if (platform === 'ps') return 'PS'
  if (platform === 'xbox') return 'Xbox'
  return 'Unassigned'
}

export function LeaderboardTable({ players, memberSearch, platformFilter }: LeaderboardTableProps) {
  const pageSize = 100
  const normalizedSearch = memberSearch.trim().toLowerCase()
  const platformSorted = [...players]
    .filter((player) => platformFilter === 'all' || player.platform === platformFilter)
    .sort((a, b) => b.xp - a.xp)
  const rankedPlayers = platformSorted.map((player, index) => ({
    player,
    place: index + 1,
  }))
  const filteredRows = rankedPlayers.filter(({ player }) => {
      if (!normalizedSearch) return true
      return (
        player.displayName.toLowerCase().includes(normalizedSearch) ||
        player.callsign?.toLowerCase().includes(normalizedSearch)
      )
    })
  const [currentPage, setCurrentPage] = useState(1)
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const activePage = Math.min(currentPage, pageCount)
  const visibleRows = filteredRows.slice((activePage - 1) * pageSize, activePage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
    setMobileDetailsOpen(false)
  }, [memberSearch, platformFilter])

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(platformSorted[0]?.id ?? null)

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1280px)')
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileDetailsOpen(false)
    }
    desktopQuery.addEventListener('change', closeDrawerOnDesktop)
    return () => desktopQuery.removeEventListener('change', closeDrawerOnDesktop)
  }, [])

  const selectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId)
    if (!window.matchMedia('(min-width: 1280px)').matches) {
      setMobileDetailsOpen(true)
    }
  }

  const selectedPlayer =
    visibleRows.find(({ player }) => player.id === selectedPlayerId)?.player ??
    visibleRows[0]?.player ??
    platformSorted[0]
  const selectedLevel = selectedPlayer ? getLevelFromXp(selectedPlayer.xp) : 0
  const selectedRank = selectedPlayer
    ? selectedPlayer.rank
      ? getRankByTier(selectedPlayer.rank)
      : getRankForXp(selectedPlayer.xp)
    : null
  const selectedProgress = selectedPlayer ? getLevelProgress(selectedPlayer.xp) : 0
  const selectedXpToNext = selectedPlayer ? getXpToNextLevel(selectedPlayer.xp) : 0
  const selectedGlobalRank = selectedPlayer
    ? players.filter((player) => player.xp > selectedPlayer.xp).length + 1
    : 0
  const selectedConsoleRank = selectedPlayer?.platform
    ? players.filter(
        (player) =>
          player.platform === selectedPlayer.platform && player.xp > selectedPlayer.xp,
      ).length + 1
    : null
  const detailsContent = selectedPlayer && selectedRank ? (
    <>
      <div className="border-b border-[#262b35] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Member Details
          </p>
          <button
            type="button"
            onClick={() => setMobileDetailsOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-[var(--color-muted-foreground)] hover:bg-white/[0.1] hover:text-white xl:hidden"
            aria-label="Close member details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center">
          <div className="min-w-0">
            <p className="truncate text-xl font-black text-white">{selectedPlayer.displayName}</p>
            {selectedPlayer.callsign && (
              <p className="truncate text-sm font-semibold text-[var(--color-muted-foreground)]">
                {selectedPlayer.callsign}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <RankBadge xp={selectedPlayer.xp} rank={selectedPlayer.rank} showLevel={false} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#262b35]">
        <div className="bg-[#171b24] p-3.5">
          <p className="text-xs font-black uppercase text-[var(--color-muted-foreground)]">Rank Points</p>
          <p className="mt-1 font-mono text-xl font-black text-white">
            {selectedPlayer.xp.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#171b24] p-3.5">
          <p className="text-xs font-black uppercase text-[var(--color-muted-foreground)]">Level</p>
          <p className="mt-1 font-mono text-xl font-black text-white">{selectedLevel}</p>
        </div>
        <div className="bg-[#171b24] p-3.5">
          <p className="text-xs font-black uppercase text-[var(--color-muted-foreground)]">
            Global Rank
          </p>
          <p className="mt-1 font-mono text-xl font-black text-white">
            #{selectedGlobalRank.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#171b24] p-3.5">
          <p className="text-xs font-black uppercase text-[var(--color-muted-foreground)]">
            Console Rank
          </p>
          <p className="mt-1 font-mono text-xl font-black text-white">
            {selectedConsoleRank ? `#${selectedConsoleRank.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Progress to Next
          </p>
        </div>
        <Progress
          value={selectedProgress}
          indicatorClassName="bg-current"
          className={selectedRank.textClass}
        />
        <p className="text-sm font-semibold text-[var(--color-muted-foreground)]">
          {selectedXpToNext.toLocaleString()} XP to Lv.{selectedLevel + 1}
          
          
        </p>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between rounded-md bg-[#242936] px-3 py-3">
            <span className="text-sm font-bold text-[var(--color-muted-foreground)]">Platform</span>
            <span
              className={cn(
                'font-black',
                selectedPlayer.platform === 'pc' && 'text-red-400',
                selectedPlayer.platform === 'ps' && 'text-blue-400',
                selectedPlayer.platform === 'xbox' && 'text-green-400',
                !selectedPlayer.platform && 'text-white',
              )}
            >
              {getPlatformLabel(selectedPlayer.platform)}
            </span>
          </div>
        </div>
      </div>
    </>
  ) : null

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#121720]/95 shadow-2xl shadow-black/25">
        <div className="divide-y divide-white/[0.06] md:hidden">
          {visibleRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
              No members match this filter.
            </p>
          ) : visibleRows.map(({ player, place }) => {
            const level = getLevelFromXp(player.xp)
            const selected = player.id === selectedPlayer?.id
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => selectPlayer(player.id)}
                className={cn(
                  'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]',
                  selected && 'bg-white/[0.055] shadow-[inset_3px_0_0_var(--color-siege-yellow)]',
                )}
              >
                <span className={cn(
                  'flex w-8 items-center justify-center font-mono text-sm font-black text-[var(--color-muted-foreground)]',
                  place <= 3 && 'text-[var(--color-siege-yellow)]',
                )}>
                  {place}
                </span>
                <span className="flex min-w-0 items-center">
                  <span className="min-w-0">
                    <span className="block truncate font-black text-white">{player.displayName}</span>
                    <span className="mt-1 block"><RankBadge xp={player.xp} rank={player.rank} showLevel={false} /></span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-sm font-black text-white">{player.xp.toLocaleString()}</span>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Lv. {level}</span>
                </span>
              </button>
            )
          })}
        </div>

        <Table className="hidden md:table">
          <TableHeader className="bg-[#343946]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20 text-xs font-black">Place</TableHead>
              <TableHead className="text-xs font-black">Player</TableHead>
              <TableHead className="hidden text-xs font-black md:table-cell">Rank</TableHead>
              <TableHead className="hidden text-center text-xs font-black lg:table-cell">Level</TableHead>
              <TableHead className="text-right text-xs font-black">Rank Points</TableHead>
              <TableHead className="hidden text-right text-xs font-black md:table-cell">To Next</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[var(--color-muted-foreground)]">
                  No members match this filter.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map(({ player, place }, index) => {
              const level = getLevelFromXp(player.xp)
              const selected = player.id === selectedPlayer?.id
              const xpToNext = getXpToNextLevel(player.xp)

              return (
                <TableRow
                  key={player.id}
                  tabIndex={0}
                  onClick={() => selectPlayer(player.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectPlayer(player.id)
                    }
                  }}
                  className={cn(
                    'h-[58px] cursor-pointer border-[#20242d] bg-[#151922] text-sm outline-none hover:bg-[#222733] focus-visible:bg-[#222733]',
                    index % 2 === 1 && 'bg-[#20242c]',
                    place === 1 && 'bg-[#2e2c20]',
                    place === 2 && 'bg-[#29303d]',
                    place === 3 && 'bg-[#2d2224]',
                    selected && 'shadow-[inset_4px_0_0_var(--color-siege-yellow)]',
                  )}
                >
                  <TableCell className="font-mono text-base font-black text-white">
                    <span
                      className={cn(
                        'inline-flex w-8 items-center justify-center text-[var(--color-muted-foreground)]',
                        place <= 3 && 'text-[var(--color-siege-yellow)]',
                      )}
                    >
                      {place}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-white">{player.displayName}</p>
                        {player.callsign && (
                          <p className="truncate text-xs font-semibold text-[var(--color-muted-foreground)]">
                            {player.callsign}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <RankBadge xp={player.xp} rank={player.rank} showLevel={false} />
                  </TableCell>
                  <TableCell className="hidden text-center font-mono text-base font-black lg:table-cell">
                    {level}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base font-black text-white">
                    {player.xp.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm font-bold text-[var(--color-muted-foreground)] md:table-cell">
                    {xpToNext.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[var(--color-muted-foreground)]">
                    <MoreVertical className="ml-auto h-5 w-5" />
                  </TableCell>
                </TableRow>
              )
              })
            )}
          </TableBody>
        </Table>

        {filteredRows.length > pageSize && (
          <nav
            className="flex items-center justify-between gap-3 border-t border-white/8 bg-[#171c26] px-3 py-3 sm:px-4"
            aria-label="Leaderboard pages"
          >
            <p className="hidden text-xs font-semibold text-[var(--color-muted-foreground)] sm:block">
              {(activePage - 1) * pageSize + 1}–
              {Math.min(activePage * pageSize, filteredRows.length)} of{' '}
              {filteredRows.length.toLocaleString()}
            </p>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="px-2 text-xs font-bold text-[var(--color-muted-foreground)]">
                {activePage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={activePage === pageCount}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-[var(--color-siege-yellow)] px-3 text-xs font-black text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </section>

      {detailsContent && (
        <>
          <Drawer open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
            <DrawerContent className="xl:hidden">
              <DrawerTitle className="sr-only">Member details</DrawerTitle>
              <div className="overflow-y-auto">{detailsContent}</div>
            </DrawerContent>
          </Drawer>
          <aside
            className="hidden overflow-hidden rounded-xl border border-white/10 bg-[#242a36] shadow-2xl shadow-black/30 xl:sticky xl:top-24 xl:block"
            aria-label="Member details"
          >
            {detailsContent}
          </aside>
        </>
      )}
    </div>
  )
}

interface StatsBarProps {
  playerCount: number
  lastUpdated: string | null
  error: string | null
  memberSearch: string
  onMemberSearchChange: (value: string) => void
  platformFilter: 'all' | 'pc' | 'ps' | 'xbox'
  onPlatformFilterChange: (value: 'all' | 'pc' | 'ps' | 'xbox') => void
}

export function StatsBar({
  playerCount,
  lastUpdated,
  error,
  memberSearch,
  onMemberSearchChange,
  platformFilter,
  onPlatformFilterChange,
}: StatsBarProps) {
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '-'

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Select
          value={platformFilter}
          onValueChange={(value) =>
            onPlatformFilterChange(value as 'all' | 'pc' | 'ps' | 'xbox')
          }
        >
          <SelectTrigger
            className="h-11 w-[150px] border-0 bg-[var(--color-siege-yellow)] font-black text-black shadow-lg shadow-black/20 focus:ring-black/40"
            aria-label="Console filter"
          >
            <span>Console</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pc">PC</SelectItem>
            <SelectItem value="ps">PS</SelectItem>
            <SelectItem value="xbox">Xbox</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-white/8 bg-[#242a35] px-3 text-sm font-bold text-white shadow-lg shadow-black/20 sm:min-w-[260px]">
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            value={memberSearch}
            onChange={(event) => onMemberSearchChange(event.target.value)}
            placeholder="Search member"
            className="w-full bg-transparent text-white outline-none placeholder:text-[var(--color-muted-foreground)]"
            type="search"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/8 bg-[#242a35] px-3 text-xs font-bold text-white sm:px-4 sm:text-sm">
          <Users className="h-4 w-4 text-[var(--color-siege-yellow)]" />
          {playerCount.toLocaleString()} Members
        </div>
        <div
          className={cn(
            'inline-flex h-10 min-w-0 items-center gap-2 rounded-lg border border-white/8 bg-[#242a35] px-3 text-xs font-bold sm:px-4 sm:text-sm',
            error ? 'text-[var(--color-destructive)]' : 'text-[var(--color-rank-seasoned)]',
          )}
        >
          {error ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
          {error ? 'Offline' : `Updated ${updatedLabel}`}
        </div>
      </div>
    </div>
  )
}
