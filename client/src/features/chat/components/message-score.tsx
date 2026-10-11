import { useMutation } from "@tanstack/react-query"
import { ThumbsDown, ThumbsUp } from "lucide-react"
import { useRef, useState } from "react"

import { MAX_COMMENT_CHARS, scoresApi } from "@/api/endpoints/scores"
import type { Message, Score } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import { useConversationCache } from "../queries"

/**
 * Thumbs up/down on an assistant answer (F5). Optimistic, with rollback on
 * error; a vote opens an optional comment popover (≤ 500 chars).
 */
export function MessageScore({ message }: { message: Message }) {
  const cache = useConversationCache()
  const group = useRef<HTMLDivElement>(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [comment, setComment] = useState(message.score?.comment ?? "")
  const value = message.score?.value ?? null

  const setScore = (score: Score | null) => {
    cache.update(message.conversation_id, (messages) =>
      messages.map((m) => (m.id === message.id ? { ...m, score } : m))
    )
  }

  const mutation = useMutation<
    unknown,
    Error,
    Score | null,
    { previous: Score | null }
  >({
    mutationFn: (next) =>
      next
        ? scoresApi.put(message.id, {
            value: next.value,
            ...(next.comment ? { comment: next.comment } : {}),
          })
        : scoresApi.delete(message.id),
    onMutate: (next) => {
      const previous = message.score ?? null
      setScore(next)
      return { previous }
    },
    onError: (_error, _next, context) => {
      setScore(context?.previous ?? null)
    },
  })

  const vote = (next: 1 | -1) => {
    if (value === next) {
      mutation.mutate(null)
      setCommentOpen(false)
      return
    }
    mutation.mutate({ value: next, comment: comment || null })
    setCommentOpen(true)
  }

  return (
    <div
      ref={group}
      role="group"
      aria-label="Rate this answer"
      className="flex items-center"
    >
      <Toggle
        size="sm"
        aria-label="Good answer"
        pressed={value === 1}
        onPressedChange={() => vote(1)}
        className="aria-pressed:bg-success/15 aria-pressed:text-success"
      >
        <ThumbsUp className={cn(value === 1 && "fill-current")} />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Bad answer"
        pressed={value === -1}
        onPressedChange={() => vote(-1)}
        className="aria-pressed:bg-destructive/10 aria-pressed:text-destructive"
      >
        <ThumbsDown className={cn(value === -1 && "fill-current")} />
      </Toggle>
      <Popover open={commentOpen} onOpenChange={setCommentOpen}>
        <PopoverContent
          anchor={group}
          align="start"
          side="top"
          className="w-80"
        >
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (value !== null)
                mutation.mutate({ value, comment: comment.trim() || null })
              setCommentOpen(false)
            }}
          >
            <label
              htmlFor={`comment-${message.id}`}
              className="text-sm font-medium"
            >
              {value === 1 ? "What was good?" : "What went wrong?"}{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id={`comment-${message.id}`}
              value={comment}
              maxLength={MAX_COMMENT_CHARS}
              rows={3}
              placeholder="Add a comment…"
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground tabular-nums">
                {comment.length}/{MAX_COMMENT_CHARS}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommentOpen(false)}
                >
                  Skip
                </Button>
                <Button type="submit" size="sm">
                  Save
                </Button>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}
