import { http } from "../http"
import type {
  Conversation,
  ConversationDetail,
  ConversationSummary,
  CreateConversation,
} from "../types"

export const conversationsApi = {
  listForPdf: (pdfId: string) =>
    http.get<{ items: ConversationSummary[] }>(`/pdfs/${pdfId}/conversations`),
  create: (pdfId: string, body: CreateConversation = {}) =>
    http.post<Conversation>(`/pdfs/${pdfId}/conversations`, body),
  get: (id: string) => http.get<ConversationDetail>(`/conversations/${id}`),
  rename: (id: string, title: string) =>
    http.patch<Conversation>(`/conversations/${id}`, { title }),
  delete: (id: string) => http.delete(`/conversations/${id}`),
}
