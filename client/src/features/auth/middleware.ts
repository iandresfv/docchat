import { type MiddlewareFunction, redirect } from "react-router"

import { useSession } from "@/stores/session"

import { ensureSession, safeReturnTo } from "./session"

/** Guards app routes: anonymous users go to /signin?returnTo=… */
export const requireAuth: MiddlewareFunction = async ({ request }) => {
  await ensureSession()
  if (useSession.getState().status !== "authenticated") {
    const url = new URL(request.url)
    const returnTo = `${url.pathname}${url.search}`
    throw redirect(`/signin?returnTo=${encodeURIComponent(returnTo)}`)
  }
}

/** Auth pages bounce signed-in users to where they were going. */
export const redirectIfAuthenticated: MiddlewareFunction = async ({
  request,
}) => {
  await ensureSession()
  if (useSession.getState().status === "authenticated") {
    const returnTo = new URL(request.url).searchParams.get("returnTo")
    throw redirect(safeReturnTo(returnTo))
  }
}
