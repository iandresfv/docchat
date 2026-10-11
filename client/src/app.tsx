import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { RouterProvider } from "react-router/dom"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createQueryClient } from "@/lib/query-client"
import { useThemeSync } from "@/lib/theme"
import { router } from "@/router"

export function App() {
  const [queryClient] = useState(createQueryClient)
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
