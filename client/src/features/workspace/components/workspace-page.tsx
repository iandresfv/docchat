import { FileSearch, FileText, MessagesSquare } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"

import { isApiError } from "@/api/errors"
import type { ConversationSummary } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatPanel } from "@/features/chat/components/chat-panel"
import { breakpoints, useMediaQuery } from "@/hooks/use-media-query"
import { strings } from "@/lib/strings"
import { useBreadcrumbs } from "@/stores/breadcrumbs"
import { usePreferences } from "@/stores/preferences"

import { useConversations, usePdfDetail } from "../queries"
import { useViewer } from "../store"
import { type WorkspaceControls } from "./controls"
import { ConversationList } from "./conversation-list"
import { PdfViewer } from "./pdf-viewer"

type MobileTab = "chat" | "document" | "history"

export function WorkspacePage() {
  const { pdfId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const pdfQuery = usePdfDetail(pdfId)
  const conversationsQuery = useConversations(pdfId)
  const openViewer = useViewer((s) => s.open)

  const xl = useMediaQuery(breakpoints.xl)
  const lg = useMediaQuery(breakpoints.lg)
  const md = useMediaQuery(breakpoints.md)
  const viewerCollapsed = usePreferences((s) => s.viewerCollapsed)
  const setViewerCollapsed = usePreferences((s) => s.setViewerCollapsed)
  const [viewerSheet, setViewerSheet] = useState(false)
  const [historySheet, setHistorySheet] = useState(false)
  const [tab, setTab] = useState<MobileTab>("chat")

  const conversations = conversationsQuery.data
  const requestedId = searchParams.get("c") ?? undefined
  const activeId = requestedId ?? conversations?.[0]?.id
  const active = conversations?.find((c) => c.id === activeId)
  const pdf = pdfQuery.data

  useEffect(() => {
    openViewer(pdfId)
  }, [openViewer, pdfId])

  // The newest conversation is selected when `?c` is absent (04 §4.3).
  useEffect(() => {
    if (!requestedId && activeId) {
      setSearchParams({ c: activeId }, { replace: true })
    }
  }, [requestedId, activeId, setSearchParams])

  // A citation click reveals the document wherever it lives at this size.
  useEffect(
    () =>
      useViewer.subscribe((state, prev) => {
        if (state.revealToken === prev.revealToken) return
        if (xl) setViewerCollapsed(false)
        else if (md) setViewerSheet(true)
        else setTab("document")
      }),
    [xl, md, setViewerCollapsed]
  )

  const select = (id: string | undefined) => {
    setSearchParams(id ? { c: id } : {})
    setHistorySheet(false)
    setTab("chat")
  }

  useConversationShortcuts(conversations, activeId, select)

  useBreadcrumbs([
    { label: strings.nav.library, to: "/documents" },
    ...(pdf ? [{ label: pdf.name, to: `/documents/${pdf.id}` }] : []),
    ...(active ? [{ label: active.title }] : []),
  ])

  if (
    pdfQuery.isError &&
    isApiError(pdfQuery.error) &&
    pdfQuery.error.status === 404
  ) {
    return (
      <Empty className="m-6 flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileSearch />
          </EmptyMedia>
          <EmptyTitle>Document not found</EmptyTitle>
          <EmptyDescription>It may have been deleted.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/documents" />} nativeButton={false}>
            Back to Library
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const list = pdf ? (
    <ConversationList
      pdf={pdf}
      conversations={conversations}
      loading={conversationsQuery.isPending}
      activeId={activeId}
      onSelect={select}
    />
  ) : null

  const viewer = (onCollapse?: () => void) => (
    <PdfViewer
      pdf={pdf}
      loading={pdfQuery.isPending}
      error={pdfQuery.isError}
      onRetry={() => void pdfQuery.refetch()}
      onCollapse={onCollapse}
    />
  )

  const controls: WorkspaceControls = {
    showHistory: md && !lg ? () => setHistorySheet(true) : undefined,
    showDocument:
      xl && viewerCollapsed
        ? () => setViewerCollapsed(false)
        : md && !xl
          ? () => setViewerSheet(true)
          : undefined,
  }

  const chat = (
    <ChatPanel
      key={active?.id ?? "new"}
      pdf={pdf}
      conversation={active}
      conversationsLoading={conversationsQuery.isPending}
      controls={md ? controls : {}}
      onSelectConversation={select}
    />
  )

  const skipLink = (
    <a
      href="#composer"
      className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
    >
      Skip to composer
    </a>
  )

  if (!md) {
    return (
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as MobileTab)}
        className="relative flex h-full min-h-0 flex-col gap-0"
      >
        {skipLink}
        <TabsList className="mx-3 mt-2 grid w-auto grid-cols-3">
          <TabsTrigger value="chat">
            <MessagesSquare />
            Chat
          </TabsTrigger>
          <TabsTrigger value="document">
            <FileText />
            Document
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="min-h-0 flex-1">
          {chat}
        </TabsContent>
        <TabsContent value="document" className="min-h-0 flex-1">
          {viewer()}
        </TabsContent>
        <TabsContent value="history" className="min-h-0 flex-1">
          {list}
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {skipLink}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        {lg && (
          <>
            <ResizablePanel
              id="conversations"
              defaultSize={280}
              minSize={220}
              maxSize={420}
              groupResizeBehavior="preserve-pixel-size"
            >
              {list}
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}
        <ResizablePanel id="chat" minSize={360}>
          {chat}
        </ResizablePanel>
        {xl && !viewerCollapsed && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="viewer" defaultSize="40%" minSize={320}>
              {viewer(() => setViewerCollapsed(true))}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {!xl && (
        <SidePanel
          side="right"
          open={viewerSheet}
          onOpenChange={setViewerSheet}
          title="Document"
        >
          {viewer()}
        </SidePanel>
      )}
      {!lg && (
        <SidePanel
          side="left"
          open={historySheet}
          onOpenChange={setHistorySheet}
          title="Conversations"
        >
          {list}
        </SidePanel>
      )}
    </div>
  )
}

function SidePanel({
  side,
  open,
  onOpenChange,
  title,
  children,
}: {
  side: "left" | "right"
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === "right"
            ? "w-[min(92vw,720px)] gap-0 p-0 sm:max-w-none"
            : "w-[min(85vw,320px)] gap-0 p-0"
        }
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{title} panel</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 pt-10">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

/** `[` / `]` move to the previous / next conversation (04 §4.3). */
function useConversationShortcuts(
  conversations: ConversationSummary[] | undefined,
  activeId: string | undefined,
  select: (id: string) => void
) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "[" && event.key !== "]") return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, [contenteditable=true]")) return
      if (!conversations?.length) return
      const index = conversations.findIndex((c) => c.id === activeId)
      const next = conversations[index + (event.key === "]" ? 1 : -1)]
      if (next) {
        event.preventDefault()
        select(next.id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [conversations, activeId, select])
}
