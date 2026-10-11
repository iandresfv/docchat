import type { ConversationSummary } from "@/api/types"
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

export function DeleteConversationDialog({
  conversation,
  pending,
  onCancel,
  onConfirm,
}: {
  conversation: ConversationSummary | null
  pending?: boolean
  onCancel: () => void
  onConfirm: (conversation: ConversationSummary) => void
}) {
  return (
    <AlertDialog
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            “{conversation?.title}” and its messages will be deleted. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (conversation) onConfirm(conversation)
            }}
          >
            {pending && <Spinner />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
