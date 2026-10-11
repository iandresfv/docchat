import { http } from "../http"
import type { SendMessageResponse } from "../types"

export const MAX_MESSAGE_CHARS = 4000

export const messagesApi = {
  send: (conversationId: string, content: string) =>
    http.post<SendMessageResponse>(
      `/conversations/${conversationId}/messages`,
      {
        content,
      }
    ),
}
