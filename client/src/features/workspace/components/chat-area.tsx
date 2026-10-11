import { History, MessageSquare, PanelRightOpen } from "lucide-react"

import type { ConversationSummary, PdfDetail } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

/** Buttons the layout exposes in the chat header at narrower breakpoints. */
export interface WorkspaceControls {
  showHistory?: () => void
  showDocument?: () => void
}

export function WorkspaceControlButtons({
  controls,
}: {
  controls: WorkspaceControls
}) {
  return (
    <>
      {controls.showHistory && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Show conversations"
          onClick={controls.showHistory}
        >
          <History />
        </Button>
      )}
      {controls.showDocument && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Show document"
          onClick={controls.showDocument}
        >
          <PanelRightOpen />
        </Button>
      )}
    </>
  )
}

interface Props {
  pdf: PdfDetail | undefined
  conversation: ConversationSummary | undefined
  conversationsLoading: boolean
  controls: WorkspaceControls
}

export function ChatArea({
  pdf,
  conversation,
  conversationsLoading,
  controls,
}: Props) {
  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        {controls.showHistory && (
          <WorkspaceControlButtons
            controls={{ showHistory: controls.showHistory }}
          />
        )}
        <h2 className="min-w-0 flex-1 truncate font-medium">
          {conversation?.title ?? pdf?.name ?? (
            <Skeleton className="h-4 w-40" />
          )}
        </h2>
        <WorkspaceControlButtons
          controls={{ showDocument: controls.showDocument }}
        />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {conversationsLoading ? (
          <Skeleton className="h-24 w-full max-w-xl rounded-xl" />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare />
              </EmptyMedia>
              <EmptyTitle>
                {conversation ? conversation.title : "No conversation selected"}
              </EmptyTitle>
              <EmptyDescription>
                {conversation
                  ? `${conversation.message_count} messages`
                  : "Start a conversation from the list."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </section>
  )
}
