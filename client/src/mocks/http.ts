import { delay, HttpResponse } from "msw"

import type { User } from "@/api/types"

import { db } from "./db"

export const API = "*/api/v1"

const ACCESS_TTL_SECONDS = 900

/** Small artificial latency in the browser so loading states are visible. */
export async function latency(ms = 250) {
  if (import.meta.env.MODE !== "test") await delay(ms)
}

export function problem(
  status: number,
  slug: string,
  title: string,
  detail?: string,
  extra?: {
    errors?: { loc: string[]; msg: string }[]
    headers?: Record<string, string>
  }
) {
  return HttpResponse.json(
    {
      type: `https://github.com/iandresfv/docchat/errors/${slug}`,
      title,
      status,
      detail,
      requestId: crypto.randomUUID().slice(0, 8),
      ...(extra?.errors ? { errors: extra.errors } : {}),
    },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        ...extra?.headers,
      },
    }
  )
}

export function issueAccessToken(userId: string) {
  const exp = Date.now() + ACCESS_TTL_SECONDS * 1000
  return {
    access_token: `mock.${userId}.${exp}`,
    token_type: "Bearer" as const,
    expires_in: ACCESS_TTL_SECONDS,
  }
}

/** Returns the user for a valid bearer token, or a 401 problem response. */
export function authenticate(request: Request): User | Response {
  const header = request.headers.get("Authorization") ?? ""
  const [, userId, exp] = header.replace(/^Bearer /, "").split(".")
  const user = db().users.find((u) => u.id === userId)
  if (!user || !exp || Number(exp) < Date.now()) {
    return problem(
      401,
      "unauthorized",
      "Unauthorized",
      "Missing or expired access token."
    )
  }
  return { id: user.id, email: user.email, created_at: user.created_at }
}

export function publicUser(user: User): User {
  return { id: user.id, email: user.email, created_at: user.created_at }
}
