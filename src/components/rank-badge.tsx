import { Badge } from '@/components/ui/badge'
import {
  getLevelFromXp,
  getRankByTier,
  getRankForXp,
  type RankConfig,
} from '@/lib/ranks'
import { cn } from '@/lib/utils'
import type { RankTier } from '@/lib/ranks'

interface RankBadgeProps {
  xp: number
  rank?: RankTier
  showLevel?: boolean
  className?: string
}

export function RankBadge({ xp, rank, showLevel = true, className }: RankBadgeProps) {
  const level = getLevelFromXp(xp)
  const config: RankConfig = rank ? getRankByTier(rank) : getRankForXp(xp)

  return (
    <Badge
      variant="outline"
      className={cn(
        'siege-cut gap-1.5 rounded-none border-l-4 bg-black/25 font-black tracking-[0.12em] uppercase',
        config.borderClass,
        config.bgClass,
        config.textClass,
        className,
      )}
      style={{ boxShadow: `0 0 12px ${config.glow}` }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
      {showLevel && (
        <span className="font-mono text-[10px] normal-case opacity-80">Lv.{level}</span>
      )}
    </Badge>
  )
}
