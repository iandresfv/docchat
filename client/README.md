# DocChat client

React 19 SPA for DocChat: Vite 8, TypeScript 6, Tailwind 4, shadcn/ui on Base UI, TanStack Query, React Router 8 (data mode), Zustand.

## Run it

```bash
pnpm install
pnpm dev:mock   # whole API faked in the browser (MSW) — no backend needed
pnpm dev        # real API: Vite proxies /api and /ready to VITE_DEV_API_TARGET (default http://localhost:8000)
```

Mock mode signs in with `demo@docchat.dev` / `docchat-demo` and keeps its data in `localStorage` (clear site data to reset). A few message keywords exercise error paths: `/ratelimit`, `/budget`, `/error`, `/midstream`. Upload a file whose name contains `scan` or `fail` to see a failed ingestion.

## Scripts

| Script                          | What                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm check`                    | lint + format check + type-check + unit/integration tests                                           |
| `pnpm test` / `pnpm test:watch` | Vitest (jsdom + Testing Library + MSW)                                                              |
| `pnpm test:e2e`                 | Playwright (incl. axe) against a mock-mode preview build; set `E2E_BASE_URL` to target a real stack |
| `pnpm build`                    | production build to `dist/`                                                                         |
| `pnpm gen:api`                  | regenerate `src/api/schema.d.ts` from `../api/docs/openapi.json`                                    |

## Layout

```
src/
  api/          HttpClient (bearer + refresh-once + problem+json), SSE client, upload, endpoints, types
  features/     auth · library · workspace · chat · experiments · settings
  components/   ui/ (shadcn primitives) · shared/ (shell, layout, dialogs)
  stores/       zustand: session, preferences, stream, breadcrumbs
  mocks/        MSW fake API used by `dev:mock` and the test suite
  lib/          env, strings, formatting, theme, query client
tests/          unit · integration · e2e
```

## Container

`docker build -t docchat-client client/` produces an unprivileged nginx image serving the SPA on port 8080 and proxying `/api` to `$API_UPSTREAM` (default `http://docchat-api`).
