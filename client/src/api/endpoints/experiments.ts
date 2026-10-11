import { http } from "../http"
import type { ComponentCatalog, ExperimentSummary } from "../types"

export const experimentsApi = {
  components: () => http.get<ComponentCatalog>("/experiments/components"),
  summary: (includePinned = false) =>
    http.get<ExperimentSummary>("/experiments/summary", {
      query: { include_pinned: includePinned },
    }),
}
