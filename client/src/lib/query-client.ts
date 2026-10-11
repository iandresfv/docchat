import { MutationCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { isApiError } from "@/api/errors"

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Skip the global error toast (the caller renders the error inline). */
      silent?: boolean
    }
  }
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    // Client errors are final; retry network blips and 5xx a couple of times.
    if (error.status >= 400 && error.status < 500) return false
    if (error.slug === "aborted") return false
  }
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return
        toast.error(isApiError(error) ? error.title : "Something went wrong", {
          description: isApiError(error) ? error.detail : undefined,
        })
      },
    }),
  })
}
