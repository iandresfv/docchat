import { ApiError, parseRetryAfter, type Problem } from "./errors"
import { buildUrl, getAuthBridge } from "./http"

export interface UploadOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

function send(
  path: string,
  form: FormData,
  token: string | null,
  options: UploadOptions
): Promise<{ status: number; body: unknown; retryAfter?: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", buildUrl(path))
    xhr.responseType = "json"
    xhr.withCredentials = false
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.setRequestHeader("Accept", "application/json, application/problem+json")

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        options.onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        body: xhr.response as unknown,
        retryAfter: parseRetryAfter(xhr.getResponseHeader("Retry-After")),
      })
    }
    xhr.onerror = () => {
      reject(ApiError.network(new Error("Upload failed")))
    }
    xhr.onabort = () => {
      reject(ApiError.aborted())
    }
    options.signal?.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(form)
  })
}

/**
 * Multipart upload over XHR (fetch has no upload progress). Same auth
 * semantics as the HttpClient: bearer token, one refresh-and-retry on 401.
 */
export async function uploadFile<T>(
  path: string,
  form: FormData,
  options: UploadOptions = {}
): Promise<T> {
  const auth = getAuthBridge()
  let res = await send(path, form, auth.getAccessToken(), options)
  if (res.status === 401) {
    const token = await auth.refresh()
    if (token) res = await send(path, form, token, options)
    if (res.status === 401) auth.onUnauthorized()
  }
  if (res.status >= 200 && res.status < 300) return res.body as T

  const body = (res.body ?? {}) as Partial<Problem>
  throw new ApiError(
    {
      type: body.type ?? "unknown",
      title: body.title ?? "Upload failed",
      status: body.status ?? res.status,
      detail: body.detail,
      requestId: body.requestId,
      errors: body.errors,
    },
    res.retryAfter
  )
}
