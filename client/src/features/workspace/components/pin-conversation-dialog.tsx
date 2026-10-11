import { useState } from "react"

import type { Axis, Components } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useComponentCatalog } from "@/features/experiments/queries"

const axes: { axis: Axis; label: string }[] = [
  { axis: "llm", label: "LLM" },
  { axis: "retriever", label: "Retriever" },
  { axis: "memory", label: "Memory" },
]

/**
 * Picks an explicit (llm, retriever, memory) combination. The result is a new
 * *pinned* conversation; existing conversations never change arms.
 */
export function PinConversationDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Components
  pending?: boolean
  onConfirm: (components: Components) => void
}) {
  const { data: catalog } = useComponentCatalog()
  const [value, setValue] = useState<Partial<Components>>(initial ?? {})
  const complete = axes.every(({ axis }) => !!value[axis])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New pinned conversation</DialogTitle>
          <DialogDescription>
            Pinned conversations use exactly this combination and are excluded
            from the experiment summary by default.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {axes.map(({ axis, label }) => (
            <Field key={axis}>
              <FieldLabel htmlFor={`pin-${axis}`}>{label}</FieldLabel>
              <Select
                value={value[axis] ?? null}
                onValueChange={(arm) =>
                  setValue((v) => ({ ...v, [axis]: arm ?? undefined }))
                }
              >
                <SelectTrigger id={`pin-${axis}`} className="w-full">
                  <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {catalog?.[axis].map((arm) => (
                    <SelectItem
                      key={arm.id}
                      value={arm.id}
                      disabled={!arm.enabled}
                    >
                      <span className="font-mono text-xs">{arm.id}</span>
                      <span className="truncate text-muted-foreground">
                        {arm.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!complete || pending}
            onClick={() => {
              if (complete) onConfirm(value as Components)
            }}
          >
            {pending && <Spinner />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
