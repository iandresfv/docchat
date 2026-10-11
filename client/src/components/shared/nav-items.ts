import { FlaskConical, Library, Settings } from "lucide-react"

import { strings } from "@/lib/strings"

export const navItems = [
  { to: "/documents", label: strings.nav.library, icon: Library },
  { to: "/experiments", label: strings.nav.experiments, icon: FlaskConical },
  { to: "/settings", label: strings.nav.settings, icon: Settings },
] as const
