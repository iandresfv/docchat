/** User-facing copy, kept in one place (English only, 04-UI-SPEC). */
export const strings = {
  app: {
    name: "DocChat",
    tagline:
      "Chat with your PDFs — and measure which RAG setup actually works.",
  },
  nav: {
    library: "Library",
    experiments: "Experiments",
    settings: "Settings",
  },
  notFound: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or was moved.",
    action: "Go to Library",
  },
  routeError: {
    title: "Something went wrong",
    description: "This page failed to load. Reloading usually fixes it.",
    action: "Reload",
  },
  theme: {
    label: "Toggle theme",
    system: "System",
    light: "Light",
    dark: "Dark",
  },
} as const
