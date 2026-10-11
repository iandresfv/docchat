import { History, PanelRightOpen } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Buttons the layout exposes in the chat header at narrower breakpoints. */
export interface WorkspaceControls {
  showHistory?: () => void
  showDocument?: () => void
}

export function HistoryButton({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Show conversations"
      onClick={onClick}
    >
      <History />
    </Button>
  )
}

export function DocumentButton({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Show document"
      onClick={onClick}
    >
      <PanelRightOpen />
    </Button>
  )
}
