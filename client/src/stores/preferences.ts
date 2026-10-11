import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Theme = "system" | "light" | "dark"

export type LibraryView = "grid" | "table"

interface PreferencesState {
  theme: Theme
  libraryView: LibraryView
  setTheme: (theme: Theme) => void
  setLibraryView: (view: LibraryView) => void
}

/** Per-device UI preferences persisted in localStorage. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      libraryView: "grid",
      setTheme: (theme) => set({ theme }),
      setLibraryView: (libraryView) => set({ libraryView }),
    }),
    {
      name: "docchat.preferences",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
