import { ArrowDown, ArrowUp, MessageSquarePlus } from "lucide-react"
import { useState } from "react"

import type { CombinationStats, Components } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { formatMean, LOW_SAMPLE } from "../queries"

type SortKey =
  | "llm"
  | "retriever"
  | "memory"
  | "conversations"
  | "scores"
  | "up"
  | "down"
  | "mean"

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "llm", label: "LLM" },
  { key: "retriever", label: "Retriever" },
  { key: "memory", label: "Memory" },
  { key: "conversations", label: "Conversations", numeric: true },
  { key: "scores", label: "Ratings", numeric: true },
  { key: "up", label: "👍", numeric: true },
  { key: "down", label: "👎", numeric: true },
  { key: "mean", label: "Mean", numeric: true },
]

function compare(
  a: CombinationStats,
  b: CombinationStats,
  key: SortKey
): number {
  if (key === "mean") return (a.mean ?? -2) - (b.mean ?? -2)
  const x = a[key]
  const y = b[key]
  return typeof x === "number" && typeof y === "number"
    ? x - y
    : String(x).localeCompare(String(y))
}

/** Sortable combinations table; the accessible source of truth (04 §4.4). */
export function CombinationsTable({
  rows,
  onStartPinned,
}: {
  rows: CombinationStats[]
  onStartPinned: (components: Components) => void
}) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "mean",
    desc: true,
  })
  const sorted = [...rows].sort((a, b) => {
    const result = compare(a, b, sort.key)
    return sort.desc ? -result : result
  })

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => {
              const active = sort.key === col.key
              return (
                <TableHead
                  key={col.key}
                  aria-sort={
                    active ? (sort.desc ? "descending" : "ascending") : "none"
                  }
                  className={cn(
                    col.numeric && "text-right",
                    col.key === "llm" && "pl-4"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm hover:text-foreground",
                      col.numeric && "flex-row-reverse"
                    )}
                    onClick={() =>
                      setSort((s) => ({
                        key: col.key,
                        desc:
                          s.key === col.key ? !s.desc : col.numeric === true,
                      }))
                    }
                  >
                    {col.label}
                    {active &&
                      (sort.desc ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ArrowUp className="size-3" aria-hidden />
                      ))}
                  </button>
                </TableHead>
              )
            })}
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const low = row.scores < LOW_SAMPLE
            return (
              <TableRow
                key={`${row.llm}|${row.retriever}|${row.memory}`}
                className={cn(low && "text-muted-foreground")}
              >
                <TableCell className="pl-4 font-mono text-xs">
                  {row.llm}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.retriever}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.memory}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.conversations}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.scores}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.up}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.down}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMean(row.mean)}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Start pinned conversation with ${row.llm}, ${row.retriever}, ${row.memory}`}
                          onClick={() =>
                            onStartPinned({
                              llm: row.llm,
                              retriever: row.retriever,
                              memory: row.memory,
                            })
                          }
                        />
                      }
                    >
                      <MessageSquarePlus />
                    </TooltipTrigger>
                    <TooltipContent>Start pinned conversation</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
