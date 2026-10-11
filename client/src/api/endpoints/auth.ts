import { http } from "../http"
import type { AccessToken, AuthResponse, Credentials, User } from "../types"

export const authApi = {
  signup: (body: Credentials) =>
    http.post<AuthResponse>("/auth/signup", body, { anonymous: true }),
  signin: (body: Credentials) =>
    http.post<AuthResponse>("/auth/signin", body, { anonymous: true }),
  /** Uses the HttpOnly refresh cookie; rotates it. */
  refresh: () =>
    http.post<AccessToken>("/auth/refresh", undefined, { anonymous: true }),
  signout: (options?: { everywhere?: boolean }) =>
    http.post<undefined>(
      "/auth/signout",
      options?.everywhere ? { scope: "all" } : undefined
    ),
  me: () => http.get<User>("/auth/me"),
}
