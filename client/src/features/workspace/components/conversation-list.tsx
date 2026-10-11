import {
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import type { ConversationSummary, PdfDetail } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatRelativeShort, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from "../queries"
import { ComponentBadges } from "./component-badges"
import { DeleteConversationDialog } from "./delete-conversation-dialog"
import { PinConversationDialog } from "./pin-conversation-dialog"

interface Props {
  pdf: PdfDetail
  conversations: ConversationSummary[] | undefined
  loading: boolean
  activeId: string | undefined
  onSelect: (id: string | undefined) => void
}

export function ConversationList({
  pdf,
  conversations,
  loading,
  activeId,
  onSelect,
}: Props) {
  const create = useCreateConversation(pdf.id)
  const rename = useRenameConversation(pdf.id)
  const remove = useDeleteConversation(pdf.id)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [pinFrom, setPinFrom] = useState<ConversationSummary | null>(null)
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null)
  const ready = pdf.status === "ready"

  const startNew = () => {
    create.mutate({}, { onSuccess: (c) => onSelect(c.id) })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <h2 className="min-w-0 flex-1 truncate font-medium" title={pdf.name}>
          {pdf.name}
        </h2>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New conversation"
                disabled={!ready || create.isPending}
                onClick={startNew}
              />
            }
          >
            <Plus />
          </TooltipTrigger>
          <TooltipContent>New conversation</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : !conversations?.length ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare />
              </EmptyMedia>
              <EmptyTitle className="text-sm">No conversations yet</EmptyTitle>
              <EmptyDescription>
                Start one to ask about this PDF.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                size="sm"
                disabled={!ready || create.isPending}
                onClick={startNew}
              >
                <Plus data-icon="inline-start" />
                Start a conversation
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="space-y-1" aria-label="Conversations">
            {conversations.map((c) => (
              <li key={c.id}>
                <ConversationItem
                  conversation={c}
                  active={c.id === activeId}
                  renaming={renamingId === c.id}
                  onSelect={() => onSelect(c.id)}
                  onRename={() => setRenamingId(c.id)}
                  onRenameDone={(title) => {
                    setRenamingId(null)
                    if (title && title !== c.title)
                      rename.mutate({ id: c.id, title })
                  }}
                  onPin={() => setPinFrom(c)}
                  onDelete={() => setDeleting(c)}
                  canPin={ready}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {pinFrom && (
        <PinConversationDialog
          open
          initial={pinFrom.components}
          pending={create.isPending}
          onOpenChange={(open) => {
            if (!open) setPinFrom(null)
          }}
          onConfirm={(components) => {
            create.mutate(
              { components },
              {
                onSuccess: (c) => {
                  setPinFrom(null)
                  onSelect(c.id)
                },
              }
            )
          }}
        />
      )}
      <DeleteConversationDialog
        conversation={deleting}
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={(c) => {
          remove.mutate(c.id, {
            onSuccess: () => {
              setDeleting(null)
              if (c.id === activeId) onSelect(undefined)
            },
          })
        }}
      />
    </div>
  )
}

function ConversationItem({
  conversation: c,
  active,
  renaming,
  canPin,
  onSelect,
  onRename,
  onRenameDone,
  onPin,
  onDelete,
}: {
  conversation: ConversationSummary
  active: boolean
  renaming: boolean
  canPin: boolean
  onSelect: () => void
  onRename: () => void
  onRenameDone: (title: string | null) => void
  onPin: () => void
  onDelete: () => void
}) {
  const meta = [
    pluralize(c.message_count, "message"),
    formatRelativeShort(c.last_message_at ?? c.created_at),
  ].join(" · ")

  return (
    <div
      className={cn(
        "group/conv relative flex items-start gap-1 rounded-lg px-2.5 py-2 transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {renaming ? (
          <Input
            autoFocus
            defaultValue={c.title}
            maxLength={120}
            aria-label="Conversation title"
            className="h-7"
            onBlur={(e) => onRenameDone(e.currentTarget.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameDone(e.currentTarget.value.trim())
              if (e.key === "Escape") onRenameDone(null)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            aria-current={active ? "true" : undefined}
            className="block w-full truncate text-left font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
          >
            {c.title}
          </button>
        )}
        <p
          className={cn(
            "text-xs",
            active ? "text-accent-foreground/80" : "text-muted-foreground"
          )}
        >
          {meta}
        </p>
        <div className="relative z-10 w-fit">
          <ComponentBadges components={c.components} pinned={c.pinned} />
        </div>
      </div>
      <div className="relative z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Actions for ${c.title}`}
                className="opacity-60 group-hover/conv:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={onRename}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canPin} onClick={onPin}>
              <Pin />
              Pin to a combination…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
