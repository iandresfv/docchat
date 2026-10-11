import { Check, Copy } from "lucide-react"
import { memo, type ReactNode, useState } from "react"
import { toast } from "sonner"

import type { FinishReason, Message, Source } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { usePreferences } from "@/stores/preferences"

import { MessageMarkdown } from "./markdown"
import { messageMetaLine, modelLabel } from "./message-meta"
import { SourcesStrip } from "./source-chip"

const partialLabel: Partial<Record<FinishReason, string>> = {
  client_disconnect: "Stopped",
  error: "Interrupted",
  max_tokens: "Truncated at the output limit",
}

interface Props {
  message: Message
  /** Extra controls in the actions row (thumbs, F5). */
  actions?: ReactNode
}

/** Finished answer: label + model, sources, prose, actions (04 §4.3). */
export const AssistantMessage = memo(function AssistantMessage({
  message,
  actions,
}: Props) {
  const showUsage = usePreferences((s) => s.showUsage)
  const meta = showUsage ? messageMetaLine(message) : null
  const partial = message.finish_reason
    ? partialLabel[message.finish_reason]
    : undefined

  return (
    <article className="group/answer space-y-2.5" aria-label="DocChat answer">
      <AnswerHeader model={modelLabel(message.usage?.model)} />
      {message.sources && <SourcesStrip sources={message.sources} />}
      {message.content ? (
        <MessageMarkdown
          content={message.content}
          sources={message.sources ?? []}
        />
      ) : (
        <p className="text-muted-foreground italic">No answer was generated.</p>
      )}
      {partial && <p className="text-xs text-muted-foreground">{partial}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within/answer:opacity-100 md:group-hover/answer:opacity-100 [@media(hover:none)]:opacity-100">
        <div className="flex items-center gap-0.5">
          {actions}
          <CopyButton text={message.content} />
        </div>
        {meta && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </div>
    </article>
  )
})

export function AnswerHeader({
  model,
  streaming,
}: {
  model: string | null
  streaming?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">DocChat</span>
      {streaming ? (
        <Spinner className="size-3" aria-label="Generating" />
      ) : (
        model && (
          <Badge
            variant="muted"
            className="h-4.5 rounded-sm px-1.5 font-mono text-[11px] font-normal"
          >
            {model}
          </Badge>
        )
      )}
    </div>
  )
}

/** Non-streaming placeholder while the answer is generated. */
export function PendingAnswer() {
  return (
    <div className="space-y-2.5" aria-label="Generating answer">
      <AnswerHeader model={null} streaming />
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-12 rounded-[0.375rem]" />
        <Skeleton className="h-6 w-12 rounded-[0.375rem]" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            className="size-2 rounded-full"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Streaming draft: chips first, then growing text with a caret (F4). */
export function StreamingAnswer({
  content,
  sources,
}: {
  content: string
  sources: Source[] | null
}) {
  return (
    <article className="space-y-2.5" aria-label="DocChat answer (generating)">
      <AnswerHeader model={null} streaming />
      {sources ? (
        <SourcesStrip sources={sources} />
      ) : (
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-12 rounded-[0.375rem]" />
          <Skeleton className="h-6 w-12 rounded-[0.375rem]" />
        </div>
      )}
      <div className="is-streaming">
        {content ? (
          <MessageMarkdown content={content} sources={sources ?? []} />
        ) : (
          <div className="chat-prose">
            <p />
          </div>
        )}
      </div>
    </article>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? "Copied" : "Copy answer"}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          toast.success("Copied")
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}
