import { http, HttpResponse } from "msw"

import type { Credentials } from "@/api/types"

import { db, now, persist, refreshCookie, uuid } from "../db"
import {
  API,
  authenticate,
  issueAccessToken,
  latency,
  problem,
  publicUser,
} from "../http"

export const authHandlers = [
  http.post(`${API}/auth/signup`, async ({ request }) => {
    await latency()
    const body = (await request.json()) as Credentials
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
      return problem(422, "validation-error", "Validation Error", undefined, {
        errors: [
          { loc: ["body", "email"], msg: "value is not a valid email address" },
        ],
      })
    }
    if (body.password.length < 10) {
      return problem(422, "validation-error", "Validation Error", undefined, {
        errors: [
          { loc: ["body", "password"], msg: "Use at least 10 characters." },
        ],
      })
    }
    const email = body.email.toLowerCase()
    if (db().users.some((u) => u.email === email)) {
      return problem(409, "conflict", "Conflict", "email already registered")
    }
    const user = {
      id: uuid(),
      email,
      password: body.password,
      created_at: now(),
    }
    db().users.push(user)
    persist()
    refreshCookie.set(user.id)
    return HttpResponse.json(
      { user: publicUser(user), ...issueAccessToken(user.id) },
      { status: 201 }
    )
  }),

  http.post(`${API}/auth/signin`, async ({ request }) => {
    await latency()
    const body = (await request.json()) as Credentials
    const user = db().users.find(
      (u) =>
        u.email === body.email.toLowerCase() && u.password === body.password
    )
    if (!user) {
      return problem(401, "unauthorized", "Unauthorized", "invalid credentials")
    }
    refreshCookie.set(user.id)
    return HttpResponse.json({
      user: publicUser(user),
      ...issueAccessToken(user.id),
    })
  }),

  http.post(`${API}/auth/refresh`, async () => {
    await latency(100)
    const userId = refreshCookie.get()
    if (!userId || !db().users.some((u) => u.id === userId)) {
      return problem(
        401,
        "unauthorized",
        "Unauthorized",
        "missing refresh token"
      )
    }
    return HttpResponse.json(issueAccessToken(userId))
  }),

  http.post(`${API}/auth/signout`, async () => {
    await latency(100)
    refreshCookie.clear()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/auth/me`, async ({ request }) => {
    await latency(100)
    const user = authenticate(request)
    return user instanceof Response ? user : HttpResponse.json(user)
  }),
]
