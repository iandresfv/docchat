/** Typed access to build-time environment (01-ARCHITECTURE §10, client). */
export const env = {
  /** API origin; empty means same origin (Vite proxy in dev, nginx in the image). */
  apiUrl: (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, ""),
  appName: import.meta.env.VITE_APP_NAME || "DocChat",
} as const

export const API_BASE = `${env.apiUrl}/api/v1`
