import { useEffect } from "react"

import { type Theme, usePreferences } from "@/stores/preferences"

/** Key also read by the inline script in index.html before first paint. */
export const THEME_STORAGE_KEY = "docchat.theme"

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)")

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme
  return darkQuery().matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(theme) === "dark"
  )
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // storage unavailable (private mode): the class is still applied
  }
}

/** Keeps `<html class="dark">` in sync with the preference and the OS. */
export function useThemeSync() {
  const theme = usePreferences((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const query = darkQuery()
    const onChange = () => applyTheme("system")
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [theme])
}

export function useResolvedTheme(): "light" | "dark" {
  const theme = usePreferences((s) => s.theme)
  return resolveTheme(theme)
}
