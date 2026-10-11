import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { conversationsApi } from "@/api/endpoints/conversations"
import { pdfsApi } from "@/api/endpoints/pdfs"
import type {
  Conversation,
  ConversationDetail,
  ConversationSummary,
  CreateConversation,
} from "@/api/types"
import { pdfKeys } from "@/features/library/queries"

export const conversationKeys = {
  all: ["conversations"] as const,
  forPdf: (pdfId: string) => [...conversationKeys.all, "pdf", pdfId] as const,
  detail: (id: string) => [...conversationKeys.all, "detail", id] as const,
}

const REFRESH_MARGIN_MS = 60_000

/**
 * PDF detail incl. the presigned `download_url`; refetched silently shortly
 * before the URL expires (04 §4.3), and while ingestion is still running.
 */
export function usePdfDetail(pdfId: string) {
  return useQuery({
    queryKey: pdfKeys.detail(pdfId),
    queryFn: () => pdfsApi.get(pdfId),
    refetchInterval: (query) => {
      const pdf = query.state.data
      if (!pdf) return false
      if (pdf.status === "pending" || pdf.status === "processing") return 3_000
      const expiresIn =
        new Date(pdf.download_url_expires_at).getTime() - Date.now()
      return Math.max(5_000, expiresIn - REFRESH_MARGIN_MS)
    },
  })
}

export function useConversations(pdfId: string) {
  return useQuery({
    queryKey: conversationKeys.forPdf(pdfId),
    queryFn: async () => (await conversationsApi.listForPdf(pdfId)).items,
  })
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(id ?? ""),
    queryFn: () => conversationsApi.get(id ?? ""),
    enabled: !!id,
  })
}

function upsertSummary(
  list: ConversationSummary[] | undefined,
  conversation: Conversation
): ConversationSummary[] | undefined {
  if (!list) return list
  const exists = list.some((c) => c.id === conversation.id)
  return exists
    ? list.map((c) =>
        c.id === conversation.id ? { ...c, ...conversation } : c
      )
    : [conversation, ...list]
}

export function useCreateConversation(pdfId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateConversation = {}) =>
      conversationsApi.create(pdfId, body),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ConversationSummary[]>(
        conversationKeys.forPdf(pdfId),
        (list) => upsertSummary(list, conversation)
      )
      queryClient.setQueryData<ConversationDetail>(
        conversationKeys.detail(conversation.id),
        { ...conversation, messages: [] }
      )
      void queryClient.invalidateQueries({ queryKey: pdfKeys.list() })
    },
  })
}

export function useRenameConversation(pdfId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      conversationsApi.rename(id, title),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ConversationSummary[]>(
        conversationKeys.forPdf(pdfId),
        (list) => upsertSummary(list, conversation)
      )
      queryClient.setQueryData<ConversationDetail>(
        conversationKeys.detail(conversation.id),
        (detail) => (detail ? { ...detail, title: conversation.title } : detail)
      )
      toast.success("Renamed")
    },
  })
}

export function useDeleteConversation(pdfId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => conversationsApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ConversationSummary[]>(
        conversationKeys.forPdf(pdfId),
        (list) => list?.filter((c) => c.id !== id)
      )
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: pdfKeys.list() })
      toast.success("Deleted")
    },
  })
}
