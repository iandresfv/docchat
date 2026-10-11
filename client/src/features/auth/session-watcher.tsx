import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { useSession } from "@/stores/session"

/** Sends the user to /signin when the session ends while inside the app. */
export function SessionWatcher() {
  const status = useSession((s) => s.status)
  const endReason = useSession((s) => s.endReason)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (status !== "anonymous") return
    if (endReason === "expired") toast.error("Session expired")
    const returnTo =
      endReason === "expired"
        ? `?returnTo=${encodeURIComponent(location.pathname + location.search)}`
        : ""
    void navigate(`/signin${returnTo}`, { replace: true })
  }, [status, endReason, navigate, location.pathname, location.search])

  return null
}
