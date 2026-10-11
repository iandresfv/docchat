import { authApi } from "@/api/endpoints/auth"
import { setAuthBridge } from "@/api/http"
import { useSession } from "@/stores/session"

let refreshing: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  try {
    const { access_token } = await authApi.refresh()
    useSession.getState().setAccessToken(access_token)
    return access_token
  } catch {
    return null
  }
}

/**
 * Single-flight refresh. Across tabs the Web Locks API serialises refreshes so
 * two tabs never present the same rotating cookie (reuse would revoke the
 * whole token family — 05-OPS runbook "Debug auth").
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (
    "locks" in navigator
      ? navigator.locks.request("docchat-refresh", doRefresh)
      : doRefresh()
  ).finally(() => {
    refreshing = null
  })
  return refreshing
}

let bootstrapping: Promise<void> | null = null

/** Resolves once the session status is known (bootstraps on first call). */
export function ensureSession(): Promise<void> {
  if (useSession.getState().status !== "unknown") return Promise.resolve()
  bootstrapping ??= (async () => {
    const token = await refreshAccessToken()
    if (!token) {
      useSession.getState().signedOut(null)
      return
    }
    try {
      const user = await authApi.me()
      useSession.getState().signedIn(token, user)
    } catch {
      useSession.getState().signedOut(null)
    }
  })().finally(() => {
    bootstrapping = null
  })
  return bootstrapping
}

export async function signOut(options?: { everywhere?: boolean }) {
  try {
    await authApi.signout(options)
  } finally {
    useSession.getState().signedOut("signout")
  }
}

/** Only same-app absolute paths are accepted as `returnTo`. */
export function safeReturnTo(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/documents"
  return value
}

export function installAuthBridge() {
  setAuthBridge({
    getAccessToken: () => useSession.getState().accessToken,
    refresh: refreshAccessToken,
    onUnauthorized: () => {
      if (useSession.getState().status === "authenticated") {
        useSession.getState().signedOut("expired")
      }
    },
  })
}
