import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"

const SUGGESTED_PROMPTS = [
  "Summarize this document",
  "What are the key findings?",
  "List the main sections",
] as const

/** Empty conversation: invitation + suggested prompts that fill the composer. */
export function EmptyChat({
  pdfName,
  disabled,
  onPick,
}: {
  pdfName: string
  disabled?: boolean
  onPick: (prompt: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <FileText className="size-5" aria-hidden />
      </span>
      <h3 className="max-w-md text-base font-semibold">
        Ask anything about{" "}
        <em className="text-primary not-italic">{pdfName}</em>
      </h3>
      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={disabled}
            onClick={() => onPick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}
