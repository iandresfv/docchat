import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { http } from "@/api/http"
import type { User } from "@/api/types"
import { DEMO_USER, refreshCookie } from "@/mocks/db"
import { routes } from "@/routes"
import { useSession } from "@/stores/session"

import { renderRoutes } from "../utils"

async function signInDemo() {
  const res = await authApi.signin(DEMO_USER)
  return res
}

describe("auth", () => {
  it("redirects anonymous users to sign in with returnTo", async () => {
    const { router } = renderRoutes(routes, "/documents")
    expect(
      await screen.findByRole("heading", { name: "Sign in" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/signin")
    expect(router.state.location.search).toBe("?returnTo=%2Fdocuments")
  })

  it("signs in and lands on returnTo", async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, "/signin?returnTo=%2Fexperiments")
    await user.type(await screen.findByLabelText("Email"), DEMO_USER.email)
    await user.type(screen.getByLabelText("Password"), DEMO_USER.password)
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/experiments")
    })
    expect(useSession.getState().user?.email).toBe(DEMO_USER.email)
  })

  it("shows a generic error on bad credentials and clears the password", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/signin")
    await user.type(await screen.findByLabelText("Email"), DEMO_USER.email)
    await user.type(screen.getByLabelText("Password"), "wrong-password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(
      await screen.findByText("Invalid email or password.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toHaveValue("")
    expect(screen.getByLabelText("Password")).toHaveFocus()
  })

  it("validates the signup form on blur", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/signup")
    await user.type(await screen.findByLabelText("Email"), "not-an-email")
    await user.type(screen.getByLabelText("Password"), "short")
    await user.click(screen.getByLabelText("Confirm password"))
    expect(
      await screen.findByText("Enter a valid email address.")
    ).toBeInTheDocument()
    expect(
      await screen.findByText("Use at least 10 characters.")
    ).toBeInTheDocument()
  })

  it("restores the session from the refresh cookie on reload", async () => {
    await signInDemo()
    expect(refreshCookie.get()).not.toBeNull()
    const { router } = renderRoutes(routes, "/documents")
    expect(
      await screen.findByRole("heading", { name: "Library" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/documents")
  })

  it("refreshes an expired access token transparently, once", async () => {
    const res = await signInDemo()
    useSession.getState().signedIn(`mock.${res.user.id}.1`, res.user)
    const me = await http.get<User>("/auth/me")
    expect(me.email).toBe(DEMO_USER.email)
    expect(useSession.getState().accessToken).not.toBe(`mock.${res.user.id}.1`)
  })

  it("ends the session when the refresh also fails", async () => {
    const res = await signInDemo()
    useSession.getState().signedIn(`mock.${res.user.id}.1`, res.user)
    refreshCookie.clear()
    await expect(http.get("/auth/me")).rejects.toMatchObject({ status: 401 })
    expect(useSession.getState()).toMatchObject({
      status: "anonymous",
      endReason: "expired",
    })
  })
})
