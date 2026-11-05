# ADR-0018 — Production-readiness gaps against the reference

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The reference implementation is a teaching codebase. This project keeps its shape but closes the
gaps that would stop it being deployed by someone other than its author.

## Decision

| Gap in the reference | This project |
|---|---|
| No CI | `ci.yml` (lint, type-check, test and build per app, path-filtered), `images.yml` (multi-arch to GHCR on tags), `release.yml` |
| No tags, releases or CHANGELOG | ADR-0017 |
| No authentication | ADR-0009 |
| No metrics or tracing | ADR-0008 |
| Plaintext secrets in the Kustomize base | Secrets only in `overlays/dev` (`stringData`, development values) and an `ExternalSecret` example in `overlays/prod`, with a documented SOPS alternative. The base has no Secret at all |
| No Ingress | Production overlay with ingress-nginx, `proxy-buffering: "off"` and `proxy-read-timeout: 3600` for SSE, and cert-manager TLS. Development keeps port-forwards through Tilt |

## Kept verbatim

The parts of the reference that are already right are copied rather than reinvented: the
Makefile `help` and `check` style, the Tiltfile shape, the Kustomize base and overlay split,
problem+json errors carrying a `requestId`, the `/health` versus `/ready` distinction, the
startup probe, the security context, the three probes, the `preStop` sleep, and self-skipping
integration tests.
