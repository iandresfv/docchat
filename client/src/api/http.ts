import { API_BASE } from "@/lib/env"

import { ApiError, toApiError } from "./errors"

type Query = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Query
  /** JSON-serialised unless it is FormData. */
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Skip bearer injection and the refresh-on-401 retry (auth endpoints). */
  anonymous?: boolean
}

/**
 * Hooks the session layer plugs in (features/auth). Kept as callbacks so this
 * module has no dependency on React or the session store.
 */
export interface AuthBridge {
  getAccessToken: () => string | null
  /** Refresh the access token once; resolves to the new token or null. */
  refresh: () => Promise<string | null>
  /** Called when a request is still 401 after a refresh attempt. */
  onUnauthorized: () => void
}

let auth: AuthBridge = {
  getAccessToken: () => null,
  refresh: () => Promise.resolve(null),
  onUnauthorized: () => undefined,
}

export function setAuthBridge(bridge: AuthBridge) {
  auth = bridge
}

export function getAuthBridge(): AuthBridge {
  return auth
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function buildInit(options: RequestOptions, token: string | null): RequestInit {
  const headers: Record<string, string> = {
    Accept: "application/json, application/problem+json",
    ...options.headers,
  }
  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(options.body)
  }
  if (token && !options.anonymous) headers.Authorization = `Bearer ${token}`
  return {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
    credentials: "same-origin",
  }
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw ApiError.aborted()
    }
    throw ApiError.network(error)
  }
}

/**
 * Fetches with bearer injection; on 401 refreshes the token once and retries.
 * Returns the raw Response so callers (JSON, SSE) decide how to read it.
 */
export async function rawRequest(
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const url = buildUrl(path, options.query)
  let response = await send(url, buildInit(options, auth.getAccessToken()))

  if (response.status === 401 && !options.anonymous) {
    const token = await auth.refresh()
    if (token) response = await send(url, buildInit(options, token))
    if (response.status === 401) auth.onUnauthorized()
  }

  if (!response.ok) throw await toApiError(response)
  return response
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await rawRequest(path, options)
  if (response.status === 204) return undefined as T
  const type = response.headers.get("Content-Type") ?? ""
  return (type.includes("json") ? await response.json() : undefined) as T
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = void>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
}
