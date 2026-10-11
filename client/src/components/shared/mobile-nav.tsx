import { Link, useMatch } from "react-router"

import { cn } from "@/lib/utils"

import { navItems } from "./nav-items"

/** Bottom navigation for < 768 px, where the sidebar is hidden (04 §5). */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {navItems.map((item) => (
        <MobileNavItem key={item.to} {...item} />
      ))}
    </nav>
  )
}

function MobileNavItem({ to, label, icon: Icon }: (typeof navItems)[number]) {
  const isActive = useMatch({ path: to, end: false }) !== null
  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground",
        isActive && "text-primary"
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  )
}
