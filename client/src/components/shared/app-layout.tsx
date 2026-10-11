import { useState } from "react"
import { Outlet } from "react-router"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { breakpoints, useMediaQuery } from "@/hooks/use-media-query"

import { AppBreadcrumbs } from "./app-breadcrumbs"
import { AppSidebar } from "./app-sidebar"
import { MobileNav } from "./mobile-nav"
import { OfflineBanner } from "./offline-banner"
import { ShortcutsDialog } from "./shortcuts-dialog"
import { ThemeToggle } from "./theme-toggle"

/**
 * Authenticated layout: sidebar expanded ≥ 1280 px, icon rail below, hidden
 * with bottom tabs < 768 px (04 §5). A manual toggle wins until the
 * breakpoint changes again.
 */
export function AppLayout({
  sidebarFooter,
}: {
  sidebarFooter?: React.ReactNode
}) {
  const wide = useMediaQuery(breakpoints.xl)
  const [override, setOverride] = useState<{ wide: boolean; open: boolean }>()
  const open = override?.wide === wide ? override.open : wide

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) => setOverride({ wide, open: next })}
      className="h-svh"
    >
      <AppSidebar footer={sidebarFooter} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <OfflineBanner />
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 max-md:hidden" />
          <div aria-hidden className="h-4 w-px bg-border max-md:hidden" />
          <AppBreadcrumbs />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto max-md:pb-14">
          <Outlet />
        </div>
      </SidebarInset>
      <MobileNav />
      <ShortcutsDialog />
    </SidebarProvider>
  )
}
