import { Spinner } from "@/components/ui/spinner"

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-svh items-center justify-center"
      role="status"
      aria-label={label}
    >
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}
