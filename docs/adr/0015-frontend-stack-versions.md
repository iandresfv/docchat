# ADR-0015 — Frontend stack versions

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Verified 2026-10-11: React 19.3, Vite 8 (Rolldown), `@vitejs/plugin-react` 6, Tailwind 4.3,
shadcn CLI 4 with Base UI as the default primitive and style presets, TanStack Query 5.104,
React Router 8 (data mode), Zustand 5, Vitest 5, Playwright 1.64, ESLint 10, typescript-eslint
8.71 (peer range TypeScript < 6.1), TypeScript 7.0 (the Go compiler).

## Decision

Adopt all current majors **except TypeScript**, which is pinned to the latest 6.x until
typescript-eslint supports 7. shadcn initialised with `init -b base -p nova` and
`baseColor: zinc`. React Router in data mode with `createBrowserRouter` and route middleware for
the auth guards. The React Compiler is enabled, with the `react-hooks` `recommended-latest`
rules.

## Rejected

Next.js (SSR is irrelevant here and static hosting in Kubernetes is simpler),
`@microsoft/fetch-event-source` (unmaintained since 2021), and `@react-pdf-viewer` (archived).

## Reversal

Unpin TypeScript once the linter catches up.
