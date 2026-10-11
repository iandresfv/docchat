import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { strings } from "@/lib/strings"
import { useResolvedTheme } from "@/lib/theme"
import { type Theme, usePreferences } from "@/stores/preferences"

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: strings.theme.system, icon: Monitor },
  { value: "light", label: strings.theme.light, icon: Sun },
  { value: "dark", label: strings.theme.dark, icon: Moon },
]

export function ThemeToggle() {
  const theme = usePreferences((s) => s.theme)
  const setTheme = usePreferences((s) => s.setTheme)
  const resolved = useResolvedTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={strings.theme.label}
          />
        }
      >
        {resolved === "dark" ? <Moon /> : <Sun />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {options.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
