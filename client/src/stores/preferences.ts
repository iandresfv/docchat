import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Theme = "system" | "light" | "dark"

export type LibraryView = "grid" | "table"

interface PreferencesState {
  theme: Theme
  libraryView: LibraryView
  viewerCollapsed: boolean
  /** Show "1.8 s · 3.9k in / 412 out · $0.0006" under answers. */
  showUsage: boolean
  /** Stream answers token by token (SSE) instead of waiting for the full reply. */
  streamAnswers: boolean
  setTheme: (theme: Theme) => void
  setLibraryView: (view: LibraryView) => void
  setViewerCollapsed: (collapsed: boolean) => void
  setShowUsage: (show: boolean) => void
  setStreamAnswers: (stream: boolean) => void
}

/** Per-device UI preferences persisted in localStorage. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      libraryView: "grid",
      viewerCollapsed: false,
      showUsage: true,
      streamAnswers: true,
      setTheme: (theme) => set({ theme }),
      setLibraryView: (libraryView) => set({ libraryView }),
      setViewerCollapsed: (viewerCollapsed) => set({ viewerCollapsed }),
      setShowUsage: (showUsage) => set({ showUsage }),
      setStreamAnswers: (streamAnswers) => set({ streamAnswers }),
    }),
    {
      name: "docchat.preferences",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
