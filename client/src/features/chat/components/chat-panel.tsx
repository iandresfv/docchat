import { Download, MoreHorizontal, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { ApiError } from "@/api/errors"
import type { ConversationSummary, PdfDetail } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  DocumentButton,
  HistoryButton,
  type WorkspaceControls,
} from "@/features/workspace/components/controls"
import { DeleteConversationDialog } from "@/features/workspace/components/delete-conversation-dialog"
import {
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from "@/features/workspace/queries"
import { useCountdown } from "@/hooks/use-countdown"
import { usePreferences } from "@/stores/preferences"
import { useStreamStore } from "@/stores/stream"

import { conversationToMarkdown, downloadText, slugify } from "../export"
import {
  optimisticHuman,
  useConversationCache,
  useLatestTurn,
  useSendMessage,
} from "../queries"
import { useStreamAnswer } from "../stream"
import { PendingAnswer, StreamingAnswer } from "./assistant-message"
import { Composer, type ComposerHandle } from "./composer"
import { EmptyChat } from "./empty-chat"
import { MessageError } from "./message-error"
import { MessageList } from "./message-list"

interface Props {
  pdf: PdfDetail | undefined
  conversation: ConversationSummary | undefined
  conversationsLoading: boolean
  controls: WorkspaceControls
  onSelectConversation: (id: string | undefined) => void
}

export function ChatPanel({
  pdf,
  conversation,
  conversationsLoading,
  controls,
  onSelectConversation,
}: Props) {
  const conversationId = conversation?.id
  const detail = useConversation(conversationId)
  const create = useCreateConversation(pdf?.id ?? "")
  const send = useSendMessage()
  const streamAnswer = useStreamAnswer()
  const cache = useConversationCache()
  const turn = useLatestTurn(conversationId)
  const streamDraft = useStreamStore((s) =>
    conversationId ? s.drafts[conversationId] : undefined
  )
  const streamFailure = useStreamStore((s) =>
    conversationId ? s.failures[conversationId] : undefined
  )
  const clearFailure = useStreamStore((s) => s.clearFailure)
  const streamAnswers = usePreferences((s) => s.streamAnswers)
  const composer = useRef<ComposerHandle>(null)
  const status = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState("")

  // The most recent failure wins, whichever transport produced it.
  const failure: Failure | null =
    streamFailure &&
    (turn.status !== "error" || streamFailure.at >= turn.submittedAt)
      ? {
          error: streamFailure.error,
          content: streamFailure.content,
          replaceId: streamFailure.userMessageId,
          at: streamFailure.at,
        }
      : turn.status === "error" && turn.error && turn.variables
        ? {
            error: turn.error,
            content: turn.variables.content,
            replaceId: turn.variables.optimisticId,
            at: turn.submittedAt,
          }
        : null

  const throttled =
    failure?.error.slug === "rate-limited" ||
    failure?.error.slug === "budget-exceeded"
  const blockedUntil =
    throttled && failure.error.retryAfter !== undefined
      ? failure.at + failure.error.retryAfter * 1000
      : null
  const secondsLeft = useCountdown(blockedUntil)

  const ready = pdf?.status === "ready"
  const streaming = !!streamDraft
  const pending = streaming || turn.status === "pending" || create.isPending
  const notice = !pdf
    ? null
    : pdf.status === "failed"
      ? "Ingestion failed — re-upload the file"
      : !ready
        ? "This document is still processing"
        : secondsLeft > 0
          ? `Rate limited — try again in ${secondsLeft} s`
          : null

  const stop = () => streamDraft?.controller.abort()

  // ⌘/Ctrl+K focuses the composer; Esc stops a stream (04 §4.3).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        composer.current?.focus()
      }
      if (event.key === "Escape" && streaming) {
        event.preventDefault()
        stop()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // Screen readers hear when an answer starts and ends, never the tokens.
  const wasStreaming = useRef(false)
  useEffect(() => {
    if (streaming === wasStreaming.current) return
    wasStreaming.current = streaming
    if (status.current) {
      status.current.textContent = streaming
        ? "Answer started"
        : "Answer complete"
    }
    if (!streaming) composer.current?.focus()
  }, [streaming])

  const submit = async (content: string, replaceId?: string) => {
    if (!pdf) return
    let id = conversationId
    if (!id) {
      const created = await create.mutateAsync({})
      id = created.id
      onSelectConversation(id)
    }
    clearFailure(id)
    const human = optimisticHuman(id, content, cache.nextSeq(id))
    cache.update(id, (messages) => [
      ...messages.filter((m) => m.id !== replaceId),
      human,
    ])
    const vars = {
      conversationId: id,
      pdfId: pdf.id,
      content,
      optimisticId: human.id,
    }
    if (streamAnswers) void streamAnswer(vars)
    else send.mutate(vars)
  }

  const onSend = () => {
    const content = draft.trim()
    if (!content) return
    setDraft("")
    void submit(content)
    composer.current?.focus()
  }

  const messages = detail.data?.messages ?? []
  const loadingMessages = !!conversationId && detail.isPending
  const showEmpty =
    !loadingMessages && messages.length === 0 && !pending && !failure

  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col">
      <ChatHeader
        conversation={conversation}
        pdf={pdf}
        controls={controls}
        loading={conversationsLoading}
        onExport={() => {
          if (!conversation) return
          downloadText(
            `${slugify(conversation.title)}.md`,
            conversationToMarkdown(conversation.title, messages)
          )
        }}
        onDeleted={() => onSelectConversation(undefined)}
      />
      <div ref={status} role="status" aria-live="polite" className="sr-only" />

      {loadingMessages || (conversationsLoading && !conversation) ? (
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-6">
          <Skeleton className="ml-auto h-10 w-2/3 rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
        </div>
      ) : showEmpty ? (
        <EmptyChat
          pdfName={pdf?.name ?? "this document"}
          disabled={!ready}
          onPick={(prompt) => {
            setDraft(prompt)
            composer.current?.focus()
          }}
        />
      ) : (
        <MessageList
          messages={messages}
          busy={pending}
          tail={
            streamDraft ? (
              <StreamingAnswer
                content={streamDraft.content}
                sources={streamDraft.sources}
              />
            ) : pending ? (
              <PendingAnswer />
            ) : failure ? (
              <MessageError
                error={failure.error}
                secondsLeft={secondsLeft}
                onRetry={() => void submit(failure.content, failure.replaceId)}
              />
            ) : null
          }
        />
      )}

      <Composer
        ref={composer}
        value={draft}
        onChange={setDraft}
        onSend={onSend}
        onStop={stop}
        streaming={streaming}
        disabled={!ready || (pending && !streaming) || secondsLeft > 0}
        notice={notice}
      />
    </section>
  )
}

interface Failure {
  error: ApiError
  content: string
  replaceId: string
  at: number
}

function ChatHeader({
  conversation,
  pdf,
  controls,
  loading,
  onExport,
  onDeleted,
}: {
  conversation: ConversationSummary | undefined
  pdf: PdfDetail | undefined
  controls: WorkspaceControls
  loading: boolean
  onExport: () => void
  onDeleted: () => void
}) {
  const rename = useRenameConversation(pdf?.id ?? "")
  const remove = useDeleteConversation(pdf?.id ?? "")
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const finish = (title: string | null) => {
    setEditing(false)
    if (conversation && title && title !== conversation.title) {
      rename.mutate({ id: conversation.id, title })
    }
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <HistoryButton onClick={controls.showHistory} />
      <div className="min-w-0 flex-1">
        {loading && !conversation ? (
          <Skeleton className="h-4 w-40" />
        ) : editing && conversation ? (
          <Input
            autoFocus
            defaultValue={conversation.title}
            maxLength={120}
            aria-label="Conversation title"
            className="h-8 max-w-sm"
            onBlur={(e) => finish(e.currentTarget.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") finish(e.currentTarget.value.trim())
              if (e.key === "Escape") finish(null)
            }}
          />
        ) : conversation ? (
          <button
            type="button"
            className="max-w-full truncate rounded-md px-1 py-0.5 text-left font-medium hover:bg-muted"
            title="Rename conversation"
            onClick={() => setEditing(true)}
          >
            {conversation.title}
          </button>
        ) : (
          <h2 className="truncate font-medium text-muted-foreground">
            New conversation
          </h2>
        )}
      </div>
      <StreamToggle />
      <DocumentButton onClick={controls.showDocument} />
      {conversation && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Conversation actions"
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onClick={onExport}>
              <Download />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DeleteConversationDialog
        conversation={deleting && conversation ? conversation : null}
        pending={remove.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={(c) => {
          remove.mutate(c.id, {
            onSuccess: () => {
              setDeleting(false)
              onDeleted()
            },
          })
        }}
      />
    </div>
  )
}

function StreamToggle() {
  const streamAnswers = usePreferences((s) => s.streamAnswers)
  const setStreamAnswers = usePreferences((s) => s.setStreamAnswers)
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch
        size="sm"
        checked={streamAnswers}
        onCheckedChange={setStreamAnswers}
        aria-label="Stream answers"
      />
      <span className="max-sm:sr-only">Stream</span>
    </label>
  )
}
