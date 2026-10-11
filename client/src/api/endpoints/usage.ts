import { http } from "../http"
import type { UsageMe } from "../types"

export const usageApi = {
  me: () => http.get<UsageMe>("/usage/me"),
}
