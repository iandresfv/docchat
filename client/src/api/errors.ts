/** RFC 9457 problem details as returned by the API (01-ARCHITECTURE §9). */
export interface Problem {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  requestId?: string
  errors?: { loc: (string | number)[]; msg: string }[]
}

const SLUG_PREFIX = /^.*\/errors\//

/** Error slugs the API emits; `network` and `unknown` are client-side. */
export type ErrorSlug =
  | "validation-error"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "pdf-not-ready"
  | "payload-too-large"
  | "unsupported-media-type"
  | "rate-limited"
  | "budget-exceeded"
  | "upstream-unavailable"
  | "internal"
  | "network"
  | "aborted"
  | "unknown"

export class ApiError extends Error {
  readonly status: number
  readonly slug: ErrorSlug
  readonly title: string
  readonly detail: string | undefined
  readonly requestId: string | undefined
  readonly fieldErrors: Problem["errors"]
  /** Seconds from `Retry-After`, when the server sent it. */
  readonly retryAfter: number | undefined

  constructor(problem: Problem, retryAfter?: number) {
    super(problem.detail ?? problem.title)
    this.name = "ApiError"
    this.status = problem.status
    this.slug = (problem.type.replace(SLUG_PREFIX, "") ||
      "unknown") as ErrorSlug
    this.title = problem.title
    this.detail = problem.detail
    this.requestId = problem.requestId
    this.fieldErrors = problem.errors
    this.retryAfter = retryAfter
  }

  static network(cause: unknown): ApiError {
    const err = new ApiError({
      type: "network",
      title: "Can't reach the server",
      status: 0,
      detail: "Check your connection and try again.",
    })
    err.cause = cause
    return err
  }

  static aborted(): ApiError {
    return new ApiError({
      type: "aborted",
      title: "Request cancelled",
      status: 0,
    })
  }

  /** Field errors keyed by the last `loc` segment (e.g. `email`). */
  fieldError(field: string): string | undefined {
    return this.fieldErrors?.find((e) => e.loc.at(-1) === field)?.msg
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds))
  const date = Date.parse(header)
  return Number.isNaN(date)
    ? undefined
    : Math.max(0, Math.ceil((date - Date.now()) / 1000))
}

/** Builds an ApiError from any non-2xx response, problem+json or not. */
export async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"))
  const type = response.headers.get("Content-Type") ?? ""
  if (type.includes("json")) {
    try {
      const body = (await response.json()) as Partial<Problem>
      return new ApiError(
        {
          type: body.type ?? "unknown",
          title: body.title ?? response.statusText,
          status: body.status ?? response.status,
          detail: body.detail,
          instance: body.instance,
          requestId:
            body.requestId ?? response.headers.get("X-Request-ID") ?? undefined,
          errors: body.errors,
        },
        retryAfter
      )
    } catch {
      // fall through to the generic error
    }
  }
  return new ApiError(
    {
      type: response.status >= 500 ? "internal" : "unknown",
      title: response.statusText || "Request failed",
      status: response.status,
      requestId: response.headers.get("X-Request-ID") ?? undefined,
    },
    retryAfter
  )
}
