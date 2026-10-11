import { useQuery } from "@tanstack/react-query"

import { experimentsApi } from "@/api/endpoints/experiments"
import type { Axis, ComponentCatalog } from "@/api/types"

export const experimentKeys = {
  all: ["experiments"] as const,
  components: () => [...experimentKeys.all, "components"] as const,
  summary: (includePinned: boolean) =>
    [...experimentKeys.all, "summary", { includePinned }] as const,
}

/** The arm catalog rarely changes: cache it for the session. */
export function useComponentCatalog() {
  return useQuery({
    queryKey: experimentKeys.components(),
    queryFn: experimentsApi.components,
    staleTime: Infinity,
  })
}

export function armDescription(
  catalog: ComponentCatalog | undefined,
  axis: Axis,
  id: string
): string | undefined {
  return catalog?.[axis].find((arm) => arm.id === id)?.description
}
