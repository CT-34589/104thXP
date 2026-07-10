import { useMemo, useState } from 'react'
import { Copy, RotateCcw, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getLevelFromXp, getXpForLevel, RANKS, type RankConfig } from '@/lib/ranks'
import { cn } from '@/lib/utils'

const MAX_LEVEL = 200
const DEFAULT_GRAPH_WEEKS = 52
const TARGET_LEVEL = 100
const TARGET_WEEKS = 52
const HIGH_ACTIVITY_EVENTS_PER_TWO_WEEKS = 35
const HIGH_ACTIVITY_EVENTS_PER_WEEK = HIGH_ACTIVITY_EVENTS_PER_TWO_WEEKS / 2
const HIGH_ACTIVITY_EVENTS_PER_YEAR = HIGH_ACTIVITY_EVENTS_PER_WEEK * TARGET_WEEKS
const TARGET_LEVEL_XP = getXpForLevel(TARGET_LEVEL)
const MAX_XP_PER_EVENT_FOR_TARGET = TARGET_LEVEL_XP / HIGH_ACTIVITY_EVENTS_PER_YEAR
const DEFAULT_XP_PER_EVENT = 13_750
const DEFAULT_EVENTS_PER_WEEK = HIGH_ACTIVITY_EVENTS_PER_WEEK

type DraftRank = Pick<RankConfig, 'tier' | 'label' | 'color' | 'glow'> & {
  minLevel: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatXp(value: number) {
  return Math.round(value).toLocaleString()
}

function getDraftRankForLevel(ranks: DraftRank[], level: number) {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (level >= ranks[i].minLevel) return ranks[i]
  }
  return ranks[0]
}

function getLevelWindow(ranks: DraftRank[], index: number) {
  const previous = index === 0 ? 0 : ranks[index - 1].minLevel + 1
  const next = index === ranks.length - 1 ? MAX_LEVEL : ranks[index + 1].minLevel - 1
  return { min: previous, max: next }
}

export function DevRankTool() {
  const [draftRanks, setDraftRanks] = useState<DraftRank[]>(
    RANKS.map((rank) => ({
      tier: rank.tier,
      label: rank.label,
      color: rank.color,
      glow: rank.glow,
      minLevel: rank.minLevel,
    })),
  )
  const [currentXp, setCurrentXp] = useState(0)
  const [xpPerEvent, setXpPerEvent] = useState(DEFAULT_XP_PER_EVENT)
  const [eventsPerWeek, setEventsPerWeek] = useState(DEFAULT_EVENTS_PER_WEEK)
  const [graphWeeks, setGraphWeeks] = useState(DEFAULT_GRAPH_WEEKS)
  const [copied, setCopied] = useState(false)

  const weeklyXp = xpPerEvent * eventsPerWeek
  const highActivityWeeklyXp = xpPerEvent * HIGH_ACTIVITY_EVENTS_PER_WEEK
  const highActivityWeeksToTarget =
    highActivityWeeklyXp > 0 ? TARGET_LEVEL_XP / highActivityWeeklyXp : Infinity
  const highActivityLevelAfterYear = getLevelFromXp(highActivityWeeklyXp * TARGET_WEEKS)
  const meetsHighActivityTarget = highActivityWeeksToTarget >= TARGET_WEEKS

  const rankRows = useMemo(
    () =>
      draftRanks.map((rank, index) => {
        const nextRank = draftRanks[index + 1]
        const maxLevel = nextRank ? nextRank.minLevel - 1 : null
        const minXp = getXpForLevel(rank.minLevel)
        const nextXp = nextRank ? getXpForLevel(nextRank.minLevel) : null
        const xpSpan = nextXp === null ? null : Math.max(0, nextXp - minXp)

        return { ...rank, maxLevel, minXp, xpSpan }
      }),
    [draftRanks],
  )

  const chartPoints = useMemo(() => {
    return Array.from({ length: graphWeeks + 1 }, (_, week) => {
      const xp = currentXp + weeklyXp * week
      const level = getLevelFromXp(xp)
      const rank = getDraftRankForLevel(draftRanks, level)
      return { week, xp, level, rank }
    })
  }, [currentXp, draftRanks, graphWeeks, weeklyXp])

  const currentLevel = getLevelFromXp(currentXp)
  const currentRank = getDraftRankForLevel(draftRanks, currentLevel)
  const projected = chartPoints[chartPoints.length - 1]

  const updateRankStart = (index: number, value: number) => {
    setDraftRanks((current) => {
      const { min, max } = getLevelWindow(current, index)
      return current.map((rank, rankIndex) =>
        rankIndex === index
          ? { ...rank, minLevel: clamp(Math.round(value), min, max) }
          : rank,
      )
    })
  }

  const reset = () => {
    setDraftRanks(
      RANKS.map((rank) => ({
        tier: rank.tier,
        label: rank.label,
        color: rank.color,
        glow: rank.glow,
        minLevel: rank.minLevel,
      })),
    )
    setCurrentXp(0)
    setXpPerEvent(DEFAULT_XP_PER_EVENT)
    setEventsPerWeek(DEFAULT_EVENTS_PER_WEEK)
    setGraphWeeks(DEFAULT_GRAPH_WEEKS)
    setCopied(false)
  }

  const exportJson = () => {
    const payload = JSON.stringify(
      rankRows.map((rank) => ({
        tier: rank.tier,
        label: rank.label,
        minLevel: rank.minLevel,
        maxLevel: rank.maxLevel,
        minXp: rank.minXp,
      })),
      null,
      2,
    )

    void navigator.clipboard?.writeText(payload)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="site-shell min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0c0f15]/88 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[var(--color-siege-yellow)]">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-[0.12em] text-white sm:text-base">
              Rank tuning tool
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] sm:text-xs">
              Visual sandbox - not connected to the leaderboard
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-white/[0.08]"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-siege-yellow)]/40 bg-[var(--color-siege-yellow)]/12 px-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-siege-yellow)] hover:bg-[var(--color-siege-yellow)]/18"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-4">
          <Card className="siege-panel overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)] bg-black/25 p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-[var(--color-siege-yellow)]" />
                XP Gain Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Current XP
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={currentXp}
                    onChange={(event) => setCurrentXp(Math.max(0, Number(event.target.value)))}
                    className="h-10 w-full rounded-md border border-[var(--color-border)] bg-black/25 px-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    XP Per Event
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={xpPerEvent}
                    onChange={(event) => setXpPerEvent(Math.max(0, Number(event.target.value)))}
                    className="h-10 w-full rounded-md border border-[var(--color-border)] bg-black/25 px-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Events Per Week
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={eventsPerWeek}
                    onChange={(event) => setEventsPerWeek(Math.max(0, Number(event.target.value)))}
                    className="h-10 w-full rounded-md border border-[var(--color-border)] bg-black/25 px-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Graph Weeks
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={260}
                    step={1}
                    value={graphWeeks}
                    onChange={(event) => setGraphWeeks(Math.round(clamp(Number(event.target.value), 1, 260)))}
                    className="h-10 w-full rounded-md border border-[var(--color-border)] bg-black/25 px-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Now" value={currentRank.label} detail={`Lv.${currentLevel} · ${formatXp(currentXp)} XP`} color={currentRank.color} />
                <Metric label="Weekly Gain" value={formatXp(weeklyXp)} detail="XP per week" color="var(--color-siege-yellow)" />
                <Metric label={`${graphWeeks} Week Projection`} value={projected.rank.label} detail={`Lv.${projected.level} · ${formatXp(projected.xp)} XP`} color={projected.rank.color} />
              </div>

              <ProgressionChart
                points={chartPoints}
                rankRows={rankRows}
                targetLevel={TARGET_LEVEL}
                targetWeeks={TARGET_WEEKS}
              />

              <div
                className={cn(
                  'rounded-md border p-3',
                  meetsHighActivityTarget
                    ? 'border-[var(--color-rank-seasoned)]/35 bg-[var(--color-rank-seasoned)]/8'
                    : 'border-[var(--color-destructive)]/45 bg-[var(--color-destructive)]/10',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                      High Activity Guardrail
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      35 events / 2 weeks should take at least 1 year to reach Lv.{TARGET_LEVEL}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-none font-black uppercase tracking-[0.12em]',
                      meetsHighActivityTarget
                        ? 'border-[var(--color-rank-seasoned)]/50 text-[var(--color-rank-seasoned)]'
                        : 'border-[var(--color-destructive)]/60 text-[var(--color-destructive)]',
                    )}
                  >
                    {meetsHighActivityTarget ? 'Within Target' : 'Too Fast'}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <GuardrailStat label="Lv.100 XP" value={formatXp(TARGET_LEVEL_XP)} />
                  <GuardrailStat label="Events / Year" value={formatXp(HIGH_ACTIVITY_EVENTS_PER_YEAR)} />
                  <GuardrailStat label="Max XP / Event" value={formatXp(MAX_XP_PER_EVENT_FOR_TARGET)} />
                  <GuardrailStat
                    label="At Current XP / Event"
                    value={
                      Number.isFinite(highActivityWeeksToTarget)
                        ? `${highActivityWeeksToTarget.toFixed(1)} weeks`
                        : 'Never'
                    }
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  With {formatXp(xpPerEvent)} XP/event at that pace, a player reaches Lv.{highActivityLevelAfterYear} after 52 weeks.
                </p>
              </div>

            </CardContent>
          </Card>

          <Card className="siege-panel overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)] bg-black/25 p-4 sm:p-5">
              <CardTitle className="text-base">Rank Level Breakpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5">
              {draftRanks.map((rank, index) => {
                const { min, max } = getLevelWindow(draftRanks, index)
                const row = rankRows[index]
                return (
                  <div
                    key={rank.tier}
                    className="grid gap-3 rounded-md border border-white/8 bg-black/20 p-3 md:grid-cols-[9rem_minmax(0,1fr)_6rem_9rem]"
                    style={{ boxShadow: `inset 3px 0 0 ${rank.color}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: rank.color }} />
                      <span className="truncate text-sm font-black text-white">{rank.label}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={rank.minLevel}
                      disabled={index === 0}
                      onChange={(event) => updateRankStart(index, Number(event.target.value))}
                      className="min-w-0 accent-[var(--color-siege-yellow)] disabled:opacity-35"
                    />
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={rank.minLevel}
                      disabled={index === 0}
                      onChange={(event) => updateRankStart(index, Number(event.target.value))}
                      className="h-9 w-full rounded-md border border-[var(--color-border)] bg-black/25 px-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-45"
                    />
                    <div className="text-xs text-[var(--color-muted-foreground)] md:text-right">
                      <p className="font-bold text-white">
                        {row.maxLevel === null ? `${row.minLevel}+` : `${row.minLevel}-${row.maxLevel}`}
                      </p>
                      <p>{formatXp(row.minXp)} XP</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="siege-panel overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)] bg-black/25 p-4">
              <CardTitle className="text-base">Generated Ladder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {rankRows.map((rank) => (
                <div
                  key={rank.tier}
                  className="rounded-md border border-white/8 bg-black/18 p-3"
                  style={{ borderLeftColor: rank.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      variant="outline"
                      className="rounded-none border-l-4 bg-black/25 font-black uppercase tracking-[0.12em]"
                      style={{
                        borderLeftColor: rank.color,
                        color: rank.color,
                        boxShadow: `0 0 12px ${rank.glow}`,
                      }}
                    >
                      {rank.label}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-[var(--color-muted-foreground)]">
                      {rank.maxLevel === null ? `Lv.${rank.minLevel}+` : `Lv.${rank.minLevel}-${rank.maxLevel}`}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[var(--color-muted-foreground)]">Min XP</p>
                      <p className="font-mono font-bold text-white">{formatXp(rank.minXp)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted-foreground)]">XP Width</p>
                      <p className="font-mono font-bold text-white">
                        {rank.xpSpan === null ? 'Open' : formatXp(rank.xpSpan)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  color,
}: {
  label: string
  value: string
  detail: string
  color: string
}) {
  return (
    <div className="rounded-md border border-white/8 bg-black/20 p-3" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className={cn('mt-1 truncate text-lg font-black', color.startsWith('var(') && 'text-[var(--color-siege-yellow)]')} style={color.startsWith('var(') ? undefined : { color }}>
        {value}
      </p>
      <p className="text-xs text-[var(--color-muted-foreground)]">{detail}</p>
    </div>
  )
}

function ProgressionChart({
  points,
  rankRows,
  targetLevel,
  targetWeeks,
}: {
  points: Array<{ week: number; xp: number; level: number; rank: DraftRank }>
  rankRows: Array<DraftRank & { maxLevel: number | null; minXp: number; xpSpan: number | null }>
  targetLevel: number
  targetWeeks: number
}) {
  const width = 920
  const height = 430
  const margin = { top: 22, right: 28, bottom: 44, left: 58 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const maxWeek = Math.max(points[points.length - 1]?.week ?? 1, 1)
  const maxLevel = Math.max(
    targetLevel,
    ...points.map((point) => point.level),
    ...rankRows.map((rank) => rank.maxLevel ?? rank.minLevel),
  )
  const chartMaxLevel = Math.max(10, Math.ceil(maxLevel / 10) * 10)
  const levelTicks = Array.from({ length: Math.floor(chartMaxLevel / 10) + 1 }, (_, index) => index * 10)
  const weekTickStep = maxWeek <= 16 ? 4 : maxWeek <= 60 ? 13 : maxWeek <= 130 ? 26 : 52
  const weekTicks = Array.from(
    { length: Math.floor(maxWeek / weekTickStep) + 1 },
    (_, index) => index * weekTickStep,
  )
  if (!weekTicks.includes(maxWeek)) weekTicks.push(maxWeek)

  const x = (week: number) => margin.left + (week / maxWeek) * innerWidth
  const y = (level: number) =>
    margin.top + innerHeight - (clamp(level, 0, chartMaxLevel) / chartMaxLevel) * innerHeight

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.week).toFixed(2)} ${y(point.level).toFixed(2)}`)
    .join(' ')

  return (
    <div className="overflow-hidden rounded-md border border-white/8 bg-black/25">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-white">
            Progression Curve
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Y axis is level, with rank bands behind the XP progression curve
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-[var(--color-siege-yellow)]" />
            Progression
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full border border-dashed border-white/60" />
            1 Year / Lv.100
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="XP progression curve by week and level"
        className="block h-auto w-full"
      >
        <rect x="0" y="0" width={width} height={height} fill="rgba(0,0,0,0.08)" />

        {rankRows.map((rank) => {
          const start = clamp(rank.minLevel, 0, chartMaxLevel)
          const end = clamp((rank.maxLevel ?? chartMaxLevel) + 1, 0, chartMaxLevel)
          const bandY = y(end)
          const bandHeight = Math.max(1, y(start) - bandY)
          const labelY = bandY + bandHeight / 2

          if (bandHeight <= 1) return null

          return (
            <g key={rank.tier}>
              <rect
                x={margin.left}
                y={bandY}
                width={innerWidth}
                height={bandHeight}
                fill={rank.color}
                opacity="0.13"
              />
              <rect
                x={margin.left}
                y={bandY}
                width="4"
                height={bandHeight}
                fill={rank.color}
                opacity="0.9"
              />
              {bandHeight >= 18 && (
                <text
                  x={margin.left + 10}
                  y={labelY + 4}
                  fill={rank.color}
                  fontSize="11"
                  fontWeight="800"
                  letterSpacing="0"
                >
                  {rank.label}
                </text>
              )}
            </g>
          )
        })}

        {levelTicks.map((tick) => (
          <g key={`level-${tick}`}>
            <line
              x1={margin.left}
              y1={y(tick)}
              x2={margin.left + innerWidth}
              y2={y(tick)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            <text
              x={margin.left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.58)"
              fontSize="11"
              fontWeight="700"
            >
              {tick}
            </text>
          </g>
        ))}

        {weekTicks.map((tick) => (
          <g key={`week-${tick}`}>
            <line
              x1={x(tick)}
              y1={margin.top}
              x2={x(tick)}
              y2={margin.top + innerHeight}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text
              x={x(tick)}
              y={height - 16}
              textAnchor="middle"
              fill="rgba(255,255,255,0.58)"
              fontSize="11"
              fontWeight="700"
            >
              {tick}w
            </text>
          </g>
        ))}

        {targetWeeks <= maxWeek && (
          <line
            x1={x(targetWeeks)}
            y1={margin.top}
            x2={x(targetWeeks)}
            y2={margin.top + innerHeight}
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
        )}
        {targetLevel <= chartMaxLevel && (
          <line
            x1={margin.left}
            y1={y(targetLevel)}
            x2={margin.left + innerWidth}
            y2={y(targetLevel)}
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
        )}
        {targetLevel <= chartMaxLevel && (
          <text
            x={margin.left + innerWidth - 6}
            y={y(targetLevel) - 8}
            textAnchor="end"
            fill="rgba(255,255,255,0.76)"
            fontSize="11"
            fontWeight="800"
          >
            Lv.{targetLevel}
          </text>
        )}

        <path
          d={path}
          fill="none"
          stroke="rgba(255,210,26,0.25)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-siege-yellow)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points
          .filter((point) => point.week === 0 || point.week === maxWeek || point.week === targetWeeks)
          .map((point) => (
            <g key={`point-${point.week}`}>
              <circle
                cx={x(point.week)}
                cy={y(point.level)}
                r="5"
                fill="var(--color-siege-yellow)"
                stroke="#0c0f15"
                strokeWidth="2"
              />
              <text
                x={x(point.week)}
                y={y(point.level) - 12}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="800"
              >
                Lv.{point.level}
              </text>
            </g>
          ))}

        <text
          x={margin.left + innerWidth / 2}
          y={height - 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.58)"
          fontSize="11"
          fontWeight="800"
        >
          Weeks
        </text>
        <text
          x="14"
          y={margin.top + innerHeight / 2}
          transform={`rotate(-90 14 ${margin.top + innerHeight / 2})`}
          textAnchor="middle"
          fill="rgba(255,255,255,0.58)"
          fontSize="11"
          fontWeight="800"
        >
          Level
        </text>
      </svg>
    </div>
  )
}

function GuardrailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/8 bg-black/20 px-3 py-2">
      <p className="text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-0.5 font-mono font-black text-white">{value}</p>
    </div>
  )
}
