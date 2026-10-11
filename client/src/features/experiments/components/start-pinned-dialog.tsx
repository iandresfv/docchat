import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router"

import { conversationsApi } from "@/api/endpoints/conversations"
import type { Components } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { usePdfs } from "@/features/library/queries"

/** Picks a ready PDF and creates a pinned conversation with the combination. */
export function StartPinnedDialog({
  components,
  onClose,
}: {
  components: Components | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { data } = usePdfs()
  const ready = data?.items.filter((p) => p.status === "ready") ?? []
  const [pdfId, setPdfId] = useState<string | null>(null)
  const selected = pdfId ?? ready[0]?.id ?? null

  const create = useMutation({
    mutationFn: ({ id, combo }: { id: string; combo: Components }) =>
      conversationsApi.create(id, { components: combo }),
    onSuccess: (conversation) => {
      onClose()
      void navigate(`/documents/${conversation.pdf_id}?c=${conversation.id}`)
    },
  })

  return (
    <Dialog
      open={components !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start pinned conversation</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">
              {components?.llm} · {components?.retriever} · {components?.memory}
            </span>
          </DialogDescription>
        </DialogHeader>
        {ready.length === 0 ? (
          <p className="text-muted-foreground">
            Upload a PDF and wait until it's ready first.
          </p>
        ) : (
          <Field>
            <FieldLabel htmlFor="pinned-pdf">Document</FieldLabel>
            <Select value={selected} onValueChange={(v) => setPdfId(v)}>
              <SelectTrigger id="pinned-pdf" className="w-full">
                <SelectValue placeholder="Choose a document">
                  {(value: string | null) =>
                    ready.find((p) => p.id === value)?.name ??
                    "Choose a document"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ready.map((pdf) => (
                  <SelectItem key={pdf.id} value={pdf.id}>
                    {pdf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected || !components || create.isPending}
            onClick={() => {
              if (selected && components)
                create.mutate({ id: selected, combo: components })
            }}
          >
            {create.isPending && <Spinner />}
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
