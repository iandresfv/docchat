import { useEffect, useState } from "react"

/**
 * Seconds left until `deadline` (epoch ms), ticking once per second.
 * Returns 0 when there is no deadline or it has passed.
 */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [deadline])

  if (deadline === null) return 0
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}
