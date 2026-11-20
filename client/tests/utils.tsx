import { type QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, type RouteObject } from "react-router"
import { RouterProvider } from "react-router/dom"
import { expect } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { createQueryClient } from "@/lib/query-client"

const rendered = new Set<QueryClient>()

export function renderWithProviders(ui: ReactNode) {
  const queryClient = createQueryClient()
  rendered.add(queryClient)
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{ui}</TooltipProvider>
      </QueryClientProvider>
    ),
  }
}

/** Renders a route tree in a memory router with app providers. */
export function renderRoutes(routes: RouteObject[], initialPath = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return { router, ...renderWithProviders(<RouterProvider router={router} />) }
}

/**
 * Waits until no rendered tree has a query in flight. A test that ends right
 * after a stream (which invalidates queries) would otherwise unmount with
 * refetches running; cancelling them mid-request broke the next test's first
 * request on CI runners ("fetch failed", never reaching the mock server).
 */
export async function settleQueries() {
  await waitFor(() => {
    for (const client of rendered) expect(client.isFetching()).toBe(0)
  })
  rendered.clear()
}
