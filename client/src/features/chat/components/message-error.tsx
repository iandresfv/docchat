import { CircleAlert, RotateCcw } from "lucide-react"

import type { ApiError } from "@/api/errors"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/** Inline error under the user message, with Retry (04 §4.3). */
export function MessageError({
  error,
  secondsLeft,
  onRetry,
}: {
  error: ApiError
  secondsLeft: number
  onRetry: () => void
}) {
  const throttled =
    error.slug === "rate-limited" || error.slug === "budget-exceeded"
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>
        {error.detail}
        {throttled && secondsLeft > 0 && (
          <span className="block">You can try again in {secondsLeft} s.</span>
        )}
      </AlertDescription>
      <AlertAction>
        <Button
          size="sm"
          variant="outline"
          disabled={throttled && secondsLeft > 0}
          onClick={onRetry}
        >
          <RotateCcw data-icon="inline-start" />
          Retry
        </Button>
      </AlertAction>
    </Alert>
  )
}
