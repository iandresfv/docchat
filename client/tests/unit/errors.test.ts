import { describe, expect, it } from "vitest"

import { parseRetryAfter, toApiError } from "@/api/errors"

describe("toApiError", () => {
  it("maps problem+json to an ApiError with slug and field errors", async () => {
    const res = new Response(
      JSON.stringify({
        type: "https://github.com/iandresfv/docchat/errors/validation-error",
        title: "Validation Error",
        status: 422,
        requestId: "req-1",
        errors: [{ loc: ["body", "email"], msg: "value is not a valid email" }],
      }),
      { status: 422, headers: { "Content-Type": "application/problem+json" } }
    )
    const err = await toApiError(res)
    expect(err.slug).toBe("validation-error")
    expect(err.status).toBe(422)
    expect(err.requestId).toBe("req-1")
    expect(err.fieldError("email")).toBe("value is not a valid email")
  })

  it("reads Retry-After and handles non-json bodies", async () => {
    const res = new Response("oops", {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Retry-After": "30" },
    })
    const err = await toApiError(res)
    expect(err.retryAfter).toBe(30)
    expect(err.title).toBe("Too Many Requests")
  })
})

describe("parseRetryAfter", () => {
  it("returns undefined for missing or invalid values", () => {
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter("soon")).toBeUndefined()
  })
})
