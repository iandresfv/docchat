import { useEffect } from "react"
import { create } from "zustand"

export interface Crumb {
  label: string
  to?: string
}

interface BreadcrumbState {
  items: Crumb[]
  set: (items: Crumb[]) => void
}

export const useBreadcrumbStore = create<BreadcrumbState>()((set) => ({
  items: [],
  set: (items) => set({ items }),
}))

/** Pages declare their trail; the app header renders it. */
export function useBreadcrumbs(items: Crumb[]) {
  const set = useBreadcrumbStore((s) => s.set)
  const key = JSON.stringify(items)
  useEffect(() => {
    set(JSON.parse(key) as Crumb[])
  }, [key, set])
}
