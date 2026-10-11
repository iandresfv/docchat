import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { pdfsApi } from "@/api/endpoints/pdfs"
import type { ApiError } from "@/api/errors"
import type { Page, Pdf } from "@/api/types"

export const pdfKeys = {
  all: ["pdfs"] as const,
  list: () => [...pdfKeys.all, "list"] as const,
  detail: (id: string) => [...pdfKeys.all, "detail", id] as const,
}

export const POLL_INTERVAL_MS = 3_000

export function isIngesting(pdf: Pick<Pdf, "status">) {
  return pdf.status === "pending" || pdf.status === "processing"
}

/** Library list; polls every 3 s while any PDF is still ingesting (04 §4.2). */
export function usePdfs() {
  return useQuery({
    queryKey: pdfKeys.list(),
    queryFn: () => pdfsApi.list(),
    refetchInterval: (query) =>
      query.state.data?.items.some(isIngesting) ? POLL_INTERVAL_MS : false,
  })
}

export function useDeletePdf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pdf: Pdf) => pdfsApi.delete(pdf.id),
    onSuccess: (_data, pdf) => {
      queryClient.setQueryData<Page<Pdf>>(pdfKeys.list(), (page) =>
        page
          ? {
              ...page,
              items: page.items.filter((p) => p.id !== pdf.id),
              total: page.total - 1,
            }
          : page
      )
      queryClient.removeQueries({ queryKey: pdfKeys.detail(pdf.id) })
      toast.success("Deleted")
    },
  })
}

export type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "uploaded"; pdf: Pdf }
  | { phase: "error"; error: ApiError }

/** Upload with progress; the uploaded PDF then follows the list polling. */
export function useUploadPdf() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)

  const mutation = useMutation<Pdf, ApiError, File>({
    mutationFn: (file) => {
      setProgress(0)
      return pdfsApi.upload(file, { onProgress: setProgress })
    },
    meta: { silent: true },
    onSuccess: (pdf) => {
      queryClient.setQueryData<Page<Pdf>>(pdfKeys.list(), (page) =>
        page
          ? { ...page, items: [pdf, ...page.items], total: page.total + 1 }
          : page
      )
      void queryClient.invalidateQueries({ queryKey: pdfKeys.list() })
    },
  })

  let state: UploadState = { phase: "idle" }
  if (mutation.isPending) state = { phase: "uploading", progress }
  else if (mutation.isSuccess) state = { phase: "uploaded", pdf: mutation.data }
  else if (mutation.isError) state = { phase: "error", error: mutation.error }

  return { state, upload: mutation.mutate, reset: mutation.reset }
}
