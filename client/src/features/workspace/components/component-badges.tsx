import { Pin } from "lucide-react"

import type { Axis, Components } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  armDescription,
  useComponentCatalog,
} from "@/features/experiments/queries"

const axes: Axis[] = ["llm", "retriever", "memory"]

/** `haiku-5-5 · mmr_k4 · window_6` with arm descriptions on hover. */
export function ComponentBadges({
  components,
  pinned,
}: {
  components: Components
  pinned?: boolean
}) {
  const { data: catalog } = useComponentCatalog()
  return (
    <div className="flex flex-wrap items-center gap-1">
      {axes.map((axis) => (
        <Tooltip key={axis}>
          <TooltipTrigger
            render={
              <Badge
                variant="muted"
                className="h-4.5 rounded-sm px-1.5 font-mono text-[11px] font-normal"
              />
            }
          >
            {components[axis]}
          </TooltipTrigger>
          <TooltipContent>
            <span className="capitalize">{axis}</span>:{" "}
            {armDescription(catalog, axis, components[axis]) ??
              components[axis]}
          </TooltipContent>
        </Tooltip>
      ))}
      {pinned && (
        <Pin
          className="size-3 text-muted-foreground"
          aria-label="Pinned combination"
        />
      )}
    </div>
  )
}
