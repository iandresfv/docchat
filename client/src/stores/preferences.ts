import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Theme = "system" | "light" | "dark"

export type LibraryView = "grid" | "table"

interface PreferencesState {
  theme: Theme
  libraryView: LibraryView
  viewerCollapsed: boolean
  setTheme: (theme: Theme) => void
  setLibraryView: (view: LibraryView) => void
  setViewerCollapsed: (collapsed: boolean) => void
}

/** Per-device UI preferences persisted in localStorage. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      libraryView: "grid",
      viewerCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setLibraryView: (libraryView) => set({ libraryView }),
      setViewerCollapsed: (viewerCollapsed) => set({ viewerCollapsed }),
    }),
    {
      name: "docchat.preferences",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
