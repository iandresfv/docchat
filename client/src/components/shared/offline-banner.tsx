import { useQuery } from "@tanstack/react-query"
import { WifiOff } from "lucide-react"
import { useSyncExternalStore } from "react"

import { env } from "@/lib/env"

function useOnline() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange)
      window.addEventListener("offline", onChange)
      return () => {
        window.removeEventListener("online", onChange)
        window.removeEventListener("offline", onChange)
      }
    },
    () => navigator.onLine,
    () => true
  )
}

async function checkReady(): Promise<boolean> {
  try {
    const res = await fetch(`${env.apiUrl}/ready`, { cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

/** Global "offline / API down" bar driven by `onLine` + `/ready` (04 §4.3). */
export function OfflineBanner() {
  const online = useOnline()
  const { data: ready = true } = useQuery({
    queryKey: ["ready"],
    queryFn: checkReady,
    enabled: online,
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data === false ? 5_000 : 30_000),
  })

  if (online && ready) return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-xs font-medium text-black"
    >
      <WifiOff className="size-3.5" aria-hidden />
      {online
        ? "Can't reach DocChat — reconnecting…"
        : "You're offline — reconnecting"}
    </div>
  )
}
