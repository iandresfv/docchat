import { FlaskConical, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

import type { Axis, Components } from "@/api/types"
import { PageHeader } from "@/components/shared/page-header"
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { formatRelative } from "@/lib/format"
import { strings } from "@/lib/strings"
import { cn } from "@/lib/utils"
import { useBreadcrumbs } from "@/stores/breadcrumbs"

import { useComponentCatalog, useExperimentSummary } from "../queries"
import { CombinationsTable } from "./combinations-table"
import { MarginalCard } from "./marginal-card"
import { StartPinnedDialog } from "./start-pinned-dialog"

const axes: { axis: Axis; title: string }[] = [
  { axis: "llm", title: "LLM" },
  { axis: "retriever", title: "Retriever" },
  { axis: "memory", title: "Memory" },
]

/** Re-renders periodically so "Updated 2 min ago" stays true. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function ExperimentsPage() {
  useBreadcrumbs([{ label: strings.nav.experiments }])
  const [includePinned, setIncludePinned] = useState(false)
  const [pinning, setPinning] = useState<Components | null>(null)
  const summary = useExperimentSummary(includePinned)
  const catalog = useComponentCatalog()
  const now = useNow(30_000)

  const data = summary.data
  const totalRatings =
    data?.combinations.reduce((sum, c) => sum + c.scores, 0) ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={strings.nav.experiments}
        description="Every new conversation is assigned an LLM, a retriever and a memory strategy. Ratings on answers feed back into the choice (ε-greedy, ε = 0.2)."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={includePinned}
                onCheckedChange={setIncludePinned}
              />
              Include pinned conversations
            </label>
            <Button
              variant="outline"
              size="sm"
              disabled={summary.isFetching}
              onClick={() => void summary.refetch()}
            >
              <RefreshCw
                data-icon="inline-start"
                className={cn(summary.isFetching && "animate-spin")}
              />
              {data
                ? `Updated ${formatRelative(data.generated_at, now)}`
                : "Refresh"}
            </Button>
          </>
        }
      />

      {summary.isPending ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </>
      ) : summary.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load the experiment summary.</AlertTitle>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void summary.refetch()}
            >
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : !data || totalRatings === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlaskConical />
            </EmptyMedia>
            <EmptyTitle>No ratings yet</EmptyTitle>
            <EmptyDescription>
              Rate a few answers in a conversation to compare setups.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/documents" />} nativeButton={false}>
              Go to Library
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <section aria-labelledby="marginals" className="space-y-3">
            <h2 id="marginals" className="sr-only">
              Mean rating per component
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {axes.map(({ axis, title }) => (
                <MarginalCard
                  key={axis}
                  title={title}
                  stats={data.marginals[axis]}
                  arms={catalog.data?.[axis] ?? []}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="combinations" className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="combinations" className="text-base font-semibold">
                Combinations
              </h2>
              <span className="text-xs text-muted-foreground">
                Rows with fewer than 5 ratings are dimmed.
              </span>
            </div>
            <CombinationsTable
              rows={data.combinations}
              onStartPinned={setPinning}
            />
          </section>
        </>
      )}

      {catalog.data && (
        <section aria-labelledby="glossary" className="space-y-3">
          <h2 id="glossary" className="text-base font-semibold">
            Components
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {axes.map(({ axis, title }) => (
              <div
                key={axis}
                className="space-y-2 rounded-xl border bg-card p-4"
              >
                <h3 className="text-sm font-semibold">{title}</h3>
                <ul className="space-y-2.5">
                  {catalog.data[axis].map((arm) => (
                    <li key={arm.id} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">
                          {arm.id}
                        </span>
                        <Badge variant={arm.enabled ? "success" : "muted"}>
                          {arm.enabled ? "enabled" : "disabled"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {arm.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <StartPinnedDialog
        components={pinning}
        onClose={() => setPinning(null)}
      />
    </div>
  )
}
