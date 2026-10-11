import { TriangleAlert } from "lucide-react"
import { isRouteErrorResponse, useRouteError } from "react-router"

import { isApiError } from "@/api/errors"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { strings } from "@/lib/strings"

import { NotFoundPage } from "./not-found-page"

/** Per-route error boundary (04 §4.6). */
export function RouteError() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  const requestId = isApiError(error) ? error.requestId : undefined
  console.error("Route error", { error, requestId })

  return (
    <div className="flex min-h-[60svh] flex-1 items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>
            <h1>{strings.routeError.title}</h1>
          </EmptyTitle>
          <EmptyDescription>
            {strings.routeError.description}
            {requestId && (
              <span className="mt-2 block font-mono text-xs">
                Request ID: {requestId}
              </span>
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>
            {strings.routeError.action}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
