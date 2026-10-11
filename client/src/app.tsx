import { FileText } from "lucide-react"

import { strings } from "@/lib/strings"

export function App() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <FileText className="size-5" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">{strings.app.name}</h1>
        <p className="text-muted-foreground">{strings.app.tagline}</p>
      </div>
    </main>
  )
}
