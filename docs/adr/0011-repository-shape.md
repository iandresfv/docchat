# ADR-0011 — Repository shape

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Two applications in two languages, deployed to the same cluster, released together.

## Decision

A single repository with `api/` and `client/` as siblings and the shared infrastructure at the
root (`deploy/`, `Tiltfile`, `Makefile`, `.github/`), because the cluster hosts both.

This is not a formal monorepo — no turborepo, nx or pnpm workspaces. There are two languages, no
shared packages and nothing to orchestrate between them. Versions are repository-wide: one tag
covers both images.

## Consequences

CI uses path filters so a change under `client/` does not run the Python jobs and vice versa.

## Reversal

Splitting into two repositories would mean duplicating `deploy/` and coordinating two tags per
release.
