import { ArrowUp, Square } from "lucide-react"
import {
  type KeyboardEvent,
  type Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react"

import { MAX_MESSAGE_CHARS } from "@/api/endpoints/messages"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const COUNTER_FROM = 3500
const MAX_LINES = 8
const LINE_HEIGHT = 20

export interface ComposerHandle {
  focus: () => void
}

interface Props {
  ref?: Ref<ComposerHandle>
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  streaming?: boolean
  /** Disables input entirely (PDF not ready, throttled). */
  disabled?: boolean
  notice?: string | null
}

/**
 * Auto-growing textarea (1–8 lines): Enter sends, Shift+Enter breaks the
 * line, Esc stops a stream. Send turns into Stop while streaming.
 */
export function Composer({
  ref,
  value,
  onChange,
  onSend,
  onStop,
  streaming = false,
  disabled = false,
  notice,
}: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const stopButton = useRef<HTMLButtonElement>(null)
  const canSend =
    !disabled &&
    !streaming &&
    value.trim().length > 0 &&
    value.length <= MAX_MESSAGE_CHARS

  useImperativeHandle(
    ref,
    () => ({ focus: () => textarea.current?.focus() }),
    []
  )

  useLayoutEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE_HEIGHT + 16)}px`
  }, [value])

  // While streaming, focus moves to Stop so keyboard users can cancel (04 §4.3).
  useLayoutEffect(() => {
    if (streaming) stopButton.current?.focus()
  }, [streaming])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (canSend) onSend()
    }
  }

  return (
    <div className="shrink-0 border-t bg-card px-4 pt-3 pb-2 md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {notice && (
          <p role="status" className="mb-2 text-xs text-muted-foreground">
            {notice}
          </p>
        )}
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
            disabled && "opacity-60"
          )}
        >
          <label htmlFor="composer" className="sr-only">
            Ask about this document
          </label>
          <textarea
            id="composer"
            ref={textarea}
            rows={1}
            value={value}
            disabled={disabled}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder="Ask about this document…"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          {streaming ? (
            <Button
              ref={stopButton}
              variant="outline"
              size="icon"
              aria-label="Stop generating"
              onClick={onStop}
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              aria-label="Send message"
              disabled={!canSend}
              onClick={onSend}
            >
              <ArrowUp />
            </Button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="max-sm:hidden">
            Enter to send · Shift+Enter for a new line
          </span>
          {value.length > COUNTER_FROM && (
            <span
              className={cn(
                "ml-auto tabular-nums",
                value.length >= MAX_MESSAGE_CHARS && "text-destructive"
              )}
              aria-live="polite"
            >
              {value.length}/{MAX_MESSAGE_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
