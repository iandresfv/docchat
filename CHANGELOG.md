# Changelog
All notable changes to this project are documented here. Format: [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/).

## [Unreleased]
### Added
- Repository layout, MIT license, README with the stage map, and a pull request template.
- Client scaffold: Vite 8, React 19 with the React Compiler, TypeScript 6, Tailwind 4 and shadcn/ui (Base UI, `nova`) themed with the DocChat design tokens.
- Client quality tooling: strict typescript-eslint, Prettier, Vitest with Testing Library and MSW, Playwright, and husky + lint-staged pre-commit hooks.
- App shell with a collapsible sidebar, breadcrumbs, bottom navigation on phones, system/light/dark theme, offline banner, toasts, and per-route error and not-found pages.
- Sign in and sign up with zod-validated forms, an in-memory access token, single-flight silent refresh on 401 (serialised across tabs), session bootstrap on reload and route guards.
- Mock API mode (`pnpm dev:mock`): the whole backend contract served from MSW in the browser, shared with the test suite.
- PDF library with grid and table views, upload dialog with drag and drop and progress, live ingestion status (polling every 3 s while processing, screen-reader announcement when ready) and delete with confirmation.
- Document workspace: resizable three-pane layout (conversations, chat, PDF viewer) that collapses to sheets on tablets and tabs on phones; conversation list with component-arm badges, inline rename, delete, pinned combinations and `[`/`]` navigation; native PDF viewer with page navigation and silent download-link refresh.
- Chat panel: document-style answers with Markdown, source chips (snippet and similarity on hover, click opens the page), inline `[p.N]` citations, optimistic messages, inline errors with Retry and rate-limit countdown, auto-growing composer, suggested prompts, Markdown export and token/cost meta line.
- Streaming answers over Server-Sent Events (fetch + `eventsource-parser`): sources render before text, a blinking caret while generating, Stop button and `Esc` to cancel with the partial answer kept, start/complete announcements for screen readers, and a persisted Stream toggle.
- Thumbs up/down on every answer (optimistic, rolled back on failure) with an optional comment popover.
- Experiments dashboard: diverging mean-rating bars per LLM, retriever and memory arm (low samples dimmed), sortable combinations table, include-pinned toggle, components glossary and "start pinned conversation" from any combination.
### Infrastructure
- CI workflow with a path-filtered client job: lint, format check, type-check, tests, build and a generated-API-types drift check.

[Unreleased]: https://github.com/iandresfv/docchat/commits/main
