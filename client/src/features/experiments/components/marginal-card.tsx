import type { Arm, MarginalStats } from "@/api/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { formatMean, LOW_SAMPLE } from "../queries"

/**
 * One axis (LLM / Retriever / Memory): a diverging bar per arm from −1 to +1
 * around a zero line. Positive = indigo, negative = orange, n < 5 = muted
 * (04 §4.4). Numbers are always printed next to the bar.
 */
export function MarginalCard({
  title,
  stats,
  arms,
}: {
  title: string
  stats: MarginalStats[]
  arms: Arm[]
}) {
  const rows = [...stats].sort((a, b) => (b.mean ?? -2) - (a.mean ?? -2))
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && (
          <p className="text-muted-foreground">No ratings for this axis yet.</p>
        )}
        {rows.map((row) => (
          <BarRow
            key={row.arm}
            stats={row}
            description={arms.find((a) => a.id === row.arm)?.description}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function BarRow({
  stats,
  description,
}: {
  stats: MarginalStats
  description?: string
}) {
  const low = stats.scores < LOW_SAMPLE
  const mean = stats.mean ?? 0
  const width = `${Math.abs(mean) * 50}%`
  const label = `${stats.arm}, mean ${formatMean(stats.mean)} from ${stats.scores} ratings`

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs font-medium">{stats.arm}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          n = {stats.scores}
        </span>
      </div>
      {description && (
        <p
          className="line-clamp-1 text-xs text-muted-foreground"
          title={description}
        >
          {description}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                role="img"
                aria-label={label}
                tabIndex={0}
                className="relative h-3 flex-1 rounded-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <span
              aria-hidden
              className="absolute inset-y-[-3px] left-1/2 w-px bg-border"
            />
            {stats.mean !== null && (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0",
                  mean >= 0
                    ? "left-1/2 rounded-r-[4px]"
                    : "right-1/2 rounded-l-[4px]",
                  low
                    ? "bg-muted-foreground/35"
                    : mean >= 0
                      ? "bg-chart-positive"
                      : "bg-chart-negative"
                )}
                style={{ width }}
              />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {stats.up} 👍 · {stats.down} 👎 · mean {formatMean(stats.mean)}
          </TooltipContent>
        </Tooltip>
        <span className="w-11 text-right text-sm font-medium tabular-nums">
          {formatMean(stats.mean)}
        </span>
      </div>
      {low && (
        <p className="text-xs text-muted-foreground">needs more ratings</p>
      )}
    </div>
  )
}
