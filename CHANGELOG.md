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
### Infrastructure
- CI workflow with a path-filtered client job: lint, format check, type-check, tests, build and a generated-API-types drift check.

[Unreleased]: https://github.com/iandresfv/docchat/commits/main
