/** Keyboard shortcuts (04 §4.3, §4.5). `Mod` renders as ⌘ on Apple, Ctrl elsewhere. */
export const shortcuts = [
  { keys: ["Enter"], action: "Send message" },
  { keys: ["Shift", "Enter"], action: "New line in the composer" },
  { keys: ["Mod", "K"], action: "Focus the composer" },
  { keys: ["Esc"], action: "Stop a streaming answer" },
  { keys: ["["], action: "Previous conversation" },
  { keys: ["]"], action: "Next conversation" },
  { keys: ["Mod", "B"], action: "Toggle the sidebar" },
  { keys: ["?"], action: "Show keyboard shortcuts" },
] as const

export function displayKey(key: string): string {
  if (key !== "Mod") return key
  const apple = /Mac|iPhone|iPad/.test(
    navigator.platform || navigator.userAgent
  )
  return apple ? "⌘" : "Ctrl"
}
