# ADR-0014 — Frontend: feature modules with a thin API layer, not hexagonal layering

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The reference client is fully hexagonal: domain, application, infrastructure and presentation
layers plus a DI container. This application has five screens, one backend and no business rules
beyond "is this PDF ready".

## Decision

Structure by feature — `features/{auth,library,workspace,chat,experiments,settings}` — each with
`queries.ts` (TanStack Query hooks), `components/` and an optional `store.ts` (Zustand).

One `api/` layer underneath: a typed `HttpClient` (fetch, bearer injection, 401 → refresh once,
problem+json → `ApiError`), `sse.ts` (fetch plus `eventsource-parser`), and types generated from
the OpenAPI document.

No use-case classes, no repository interfaces, no DI container. The only swappable thing is the
HTTP client, injected through a React context for tests; MSW handles the rest.

## What is gained

Roughly 40% fewer files per feature; a reader finds a screen's data, UI and state in one folder;
generated types make a mapper layer unnecessary.

## What is paid

No second data source can be swapped at the architecture level — there is none. Domain
validation lives in zod schemas next to the forms rather than in entities. If business rules
grow (offline drafts, multi-document reasoning), `features/*/model.ts` is where they go first.

**This is not a shortcut.** The tooling from the reference is kept verbatim: strict
typescript-eslint, Prettier, husky with lint-staged, Vitest with Testing Library and Playwright,
and a `tests/{unit,integration,e2e}` split.

## Reversal

Feature folders map one-to-one onto hexagonal slices if that ever becomes necessary.
