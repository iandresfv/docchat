import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react"

import type { Pdf } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PdfActionsMenu({
  pdf,
  onDelete,
  onRetry,
}: {
  pdf: Pdf
  onDelete: (pdf: Pdf) => void
  onRetry: (pdf: Pdf) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${pdf.name}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {pdf.status === "failed" && (
          <>
            <DropdownMenuItem onClick={() => onRetry(pdf)}>
              <RefreshCw />
              Retry ingestion
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(pdf)}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
