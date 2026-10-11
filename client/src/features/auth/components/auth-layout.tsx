import { FileText } from "lucide-react"
import { Outlet } from "react-router"

import { strings } from "@/lib/strings"

export function AuthLayout() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <FileText className="size-5" aria-hidden />
        </span>
        <p className="text-xl font-semibold">{strings.app.name}</p>
        <p className="max-w-xs text-muted-foreground">{strings.app.tagline}</p>
      </div>
      <div className="w-full max-w-[400px] space-y-3">
        <Outlet />
        {import.meta.env.VITE_API_MOCKS === "true" && (
          <p className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
            Mock API · sign in with{" "}
            <span className="font-mono">demo@docchat.dev</span> /{" "}
            <span className="font-mono">docchat-demo</span>
          </p>
        )}
      </div>
    </main>
  )
}
