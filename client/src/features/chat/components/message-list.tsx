import { ArrowDown } from "lucide-react"
import { Fragment, type ReactNode } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import type { Message } from "@/api/types"
import { Button } from "@/components/ui/button"

import { AssistantMessage } from "./assistant-message"
import { UserMessage } from "./user-message"

function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  })
}

interface Props {
  messages: Message[]
  /** Rendered after the last message (pending/streaming answer, error). */
  tail?: ReactNode
  busy?: boolean
  renderActions?: (message: Message) => ReactNode
}

/**
 * `role="log"` message list that sticks to the bottom while new content
 * arrives, with a "Jump to latest" pill when scrolled away (04 §4.3).
 */
export function MessageList({ messages, tail, busy, renderActions }: Props) {
  return (
    <StickToBottom
      className="relative min-h-0 flex-1"
      resize="smooth"
      initial="instant"
    >
      <StickToBottom.Content
        role="log"
        aria-label="Messages"
        aria-busy={busy}
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6"
      >
        {messages.map((message, index) => {
          const label = dayLabel(message.created_at)
          const previous = messages[index - 1]
          const showDay = !previous || dayLabel(previous.created_at) !== label
          return (
            <Fragment key={message.id}>
              {showDay && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {label}
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              {message.role === "human" ? (
                <UserMessage message={message} />
              ) : message.role === "assistant" ? (
                <AssistantMessage
                  message={message}
                  actions={renderActions?.(message)}
                />
              ) : null}
            </Fragment>
          )
        })}
        {tail}
      </StickToBottom.Content>
      <JumpToLatest />
    </StickToBottom>
  )
}

function JumpToLatest() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()
  if (isAtBottom) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background shadow-sm"
      onClick={() => void scrollToBottom()}
    >
      <ArrowDown data-icon="inline-start" />
      Jump to latest
    </Button>
  )
}
