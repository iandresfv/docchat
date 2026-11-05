# Architecture Decision Records

Each file records one decision: the context it was made in, the options that were weighed, what
was chosen, what that costs, and how to undo it.

Records are immutable once accepted. A decision that changes gets a new record that supersedes
the old one; the old file stays, with its status updated, so the history of the system's
reasoning survives.

Format follows [Michael Nygard's template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
Facts marked "verified 2026-10-11" were checked against live registries and documentation on
that date.

## Backend

| # | Decision | Status |
|---|---|---|
| [0001](0001-backend-framework-fastapi.md) | Backend framework: FastAPI | Accepted |
| [0002](0002-celery-for-ingestion-only.md) | Celery for ingestion; generation is not queued | Accepted |
| [0003](0003-four-ports.md) | Four ports, and what is deliberately not one | Accepted |
| [0004](0004-vector-store-port-two-adapters.md) | Vector store: one port, two adapters, pgvector by default | Accepted |
| [0005](0005-langgraph-state-graph-no-agent.md) | A LangGraph state graph, not an agent | Accepted |
| [0006](0006-sql-messages-are-the-memory.md) | SQL messages are the source of truth for memory | Accepted |
| [0009](0009-auth-jwt-and-rotating-refresh-cookie.md) | Access JWT plus a rotating refresh cookie | Accepted |
| [0012](0012-object-storage-garage.md) | Object storage: Garage behind the `ObjectStorage` port | Accepted |
| [0013](0013-pdf-extraction-pypdf.md) | PDF extraction: pypdf directly | Accepted |

## Quality, cost and operations

| # | Decision | Status |
|---|---|---|
| [0007](0007-evaluation-three-tiers.md) | Evaluation in three proportionate tiers | Accepted |
| [0008](0008-observability-langfuse-and-prometheus.md) | Langfuse for traces, Prometheus for metrics | Accepted |
| [0010](0010-cost-and-abuse-guardrails.md) | Cost and abuse guardrails | Accepted |
| [0018](0018-production-readiness-gaps.md) | Production-readiness gaps against the reference | Accepted |

## Frontend

| # | Decision | Status |
|---|---|---|
| [0014](0014-frontend-feature-modules.md) | Feature modules, not hexagonal layering | Accepted |
| [0015](0015-frontend-stack-versions.md) | Frontend stack versions | Accepted |
| [0016](0016-pdf-viewer-iframe.md) | PDF viewing: iframe with a presigned URL | Accepted |

## Repository and process

| # | Decision | Status |
|---|---|---|
| [0011](0011-repository-shape.md) | Repository shape | Accepted |
| [0017](0017-versioning-releases-and-changelog.md) | Versioning, releases and CHANGELOG | Accepted |
