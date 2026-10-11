import { Fragment } from "react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { displayKey, shortcuts } from "@/lib/shortcuts"

export function ShortcutsTable() {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Keyboard shortcuts</caption>
      <tbody className="divide-y">
        {shortcuts.map((s) => (
          <tr key={s.action}>
            <td className="py-2 pr-4 text-muted-foreground">{s.action}</td>
            <td className="py-2 text-right">
              <KbdGroup>
                {s.keys.map((key, i) => (
                  <Fragment key={key}>
                    {i > 0 && (
                      <span className="text-xs text-muted-foreground">+</span>
                    )}
                    <Kbd>{displayKey(key)}</Kbd>
                  </Fragment>
                ))}
              </KbdGroup>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
