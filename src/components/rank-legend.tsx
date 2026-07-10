import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getXpForLevel, RANKS } from '@/lib/ranks'
import { cn } from '@/lib/utils'

export function RankLegend() {
  return (
    <Card className="siege-panel overflow-hidden">
      <CardHeader className="border-b border-[var(--color-border)] bg-black/25 p-4 pb-3 sm:p-5 sm:pb-3">
        <CardTitle className="text-base">Rank Ladder</CardTitle>
        <CardDescription>
          Siege-inspired tier path - level is calculated from XP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <p className="siege-cut overflow-x-auto border border-[var(--color-border)] bg-black/28 px-3 py-2 font-mono text-[11px] leading-5 text-[var(--color-muted-foreground)] sm:text-xs">
          level = floor((−1 + √(1 + XP/625)) / 2) when XP &lt; 2,250,000 · else 30 +
          floor((XP − 2,250,000) / 147,500)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {RANKS.map((rank) => {
            const levelLabel =
              rank.maxLevel === null
                ? `Level ${rank.minLevel}+`
                : `Level ${rank.minLevel}–${rank.maxLevel}`
            const xpAtLevel = getXpForLevel(rank.minLevel)

            return (
              <div
                key={rank.tier}
                className="siege-cut flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-background)]/50 px-3 py-2 shadow-sm"
                style={{ borderLeftColor: rank.color, borderLeftWidth: 3, boxShadow: `inset 0 0 18px ${rank.glow}` }}
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: rank.color, boxShadow: `0 0 8px ${rank.glow}` }}
                />
                <div className="min-w-0">
                  <p className={cn('truncate text-sm font-semibold', rank.textClass)}>
                    {rank.label}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {levelLabel} · {xpAtLevel.toLocaleString()} XP
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
