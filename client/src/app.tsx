import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createQueryClient } from "@/lib/query-client"
import { useThemeSync } from "@/lib/theme"
import { routes } from "@/routes"

export function App() {
  const [queryClient] = useState(createQueryClient)
  // Created on first render, not at import: navigation runs auth middleware,
  // which must wait until the mock API (if any) is installed.
  const [router] = useState(() => createBrowserRouter(routes))
  useThemeSync()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={300}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" duration={4000} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
