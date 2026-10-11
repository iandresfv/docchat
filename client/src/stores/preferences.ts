import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Theme = "system" | "light" | "dark"

interface PreferencesState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** Per-device UI preferences persisted in localStorage. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "docchat.preferences",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
