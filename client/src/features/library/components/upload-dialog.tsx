import { CircleAlert, CircleCheck, FileText, Upload, X } from "lucide-react"
import { type DragEvent, useId, useRef, useState } from "react"
import { Link } from "react-router"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"

import { uploadErrorMessage, validatePdfFile } from "../limits"
import { usePdfs, useUploadPdf } from "../queries"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shown when the dialog was opened to retry a failed ingestion. */
  retryName?: string
}

export function UploadDialog({ open, onOpenChange, retryName }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const { state, upload, reset } = useUploadPdf()
  const { data } = usePdfs()

  // After upload, the PDF's live status comes from the polled library list.
  const uploaded =
    state.phase === "uploaded"
      ? (data?.items.find((p) => p.id === state.pdf.id) ?? state.pdf)
      : null

  const choose = (next: File | undefined) => {
    if (!next) return
    reset()
    setFile(next)
    setLocalError(validatePdfFile(next))
  }

  const clear = () => {
    reset()
    setFile(null)
    setLocalError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleOpenChange = (next: boolean) => {
    // Closing during upload would cancel nothing server-side; keep it simple
    // and only allow closing once the bytes are sent (ingestion continues).
    if (!next && state.phase === "uploading") return
    onOpenChange(next)
    if (!next) clear()
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files[0])
  }

  const serverError =
    state.phase === "error"
      ? uploadErrorMessage(state.error.status, state.error.title)
      : null
  const error = localError ?? serverError
  const busy = state.phase === "uploading"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
          <DialogDescription>
            {retryName
              ? `Re-upload “${retryName}” to retry ingestion.`
              : "Add a document to ask questions about it."}
          </DialogDescription>
        </DialogHeader>

        {!uploaded && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragging ? "border-primary bg-accent" : "border-border"
            )}
          >
            <Upload className="size-6 text-muted-foreground" aria-hidden />
            <p>
              Drop a PDF here or{" "}
              <Button
                variant="outline"
                size="sm"
                className="ml-1"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </Button>
            </p>
            <p className="text-xs text-muted-foreground">
              PDF only · up to 20 MB · up to 200 pages
            </p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label="PDF file"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </div>
        )}

        {file && (
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <FileText
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
            {!busy && !uploaded && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove file"
                onClick={clear}
              >
                <X />
              </Button>
            )}
          </div>
        )}

        {state.phase === "uploading" && (
          <Progress value={Math.round(state.progress * 100)}>
            <ProgressLabel>Uploading</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}

        {uploaded && (
          <div role="status" className="flex items-center gap-2">
            {uploaded.status === "ready" ? (
              <>
                <CircleCheck className="size-4 text-success" aria-hidden />
                Ready — {uploaded.page_count} pages indexed.
              </>
            ) : uploaded.status === "failed" ? (
              <>
                <CircleAlert className="size-4 text-destructive" aria-hidden />
                Ingestion failed{uploaded.error ? `: ${uploaded.error}` : "."}
              </>
            ) : (
              <>
                <Spinner className="text-muted-foreground" />
                Processing… you can close this dialog, ingestion continues.
              </>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <DialogFooter>
          {uploaded ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
              {uploaded.status === "ready" && (
                <Button
                  render={<Link to={`/documents/${uploaded.id}`} />}
                  nativeButton={false}
                >
                  Open document
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!file || !!localError || busy}
                onClick={() => {
                  if (file) upload(file)
                }}
              >
                {busy && <Spinner />}
                Upload
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
