import { http } from "../http"
import type { ScoreRequest, ScoreResponse } from "../types"

export const MAX_COMMENT_CHARS = 500

export const scoresApi = {
  put: (messageId: string, body: ScoreRequest) =>
    http.put<ScoreResponse>(`/messages/${messageId}/score`, body),
  delete: (messageId: string) => http.delete(`/messages/${messageId}/score`),
}
