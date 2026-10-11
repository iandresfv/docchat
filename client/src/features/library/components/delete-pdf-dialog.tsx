import type { Pdf } from "@/api/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { pluralize } from "@/lib/format"

import { useDeletePdf } from "../queries"

export function DeletePdfDialog({
  pdf,
  onClose,
}: {
  pdf: Pdf | null
  onClose: () => void
}) {
  const remove = useDeletePdf()
  const conversations =
    pdf?.conversation_count === undefined
      ? "its conversations"
      : `its ${pluralize(pdf.conversation_count, "conversation")}`

  return (
    <AlertDialog
      open={pdf !== null}
      onOpenChange={(open) => {
        if (!open && !remove.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete “{pdf?.name}” and {conversations}? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (!pdf) return
              remove.mutate(pdf, { onSuccess: onClose })
            }}
          >
            {remove.isPending && <Spinner />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
