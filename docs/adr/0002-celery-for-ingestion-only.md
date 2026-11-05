# ADR-0002 — Task queue: Celery for ingestion; generation is not queued

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Ingestion (extract → chunk → embed → upsert) takes seconds to minutes and nobody is waiting on
it. Chat generation takes seconds and somebody *is* waiting on it, token by token. These are
different problems and they were evaluated separately.

Candidates verified 2026-10-11:

| Library | State |
|---|---|
| Celery 5.6.3 | No native asyncio; the tracking issue has been open since 2017 |
| Taskiq 0.13.0 | Async-native, `taskiq-fastapi`, `taskiq-redis`; ~2.4k stars |
| dramatiq 2.2.1 | asyncio through middleware |
| arq 0.28.0 | README states maintenance-only, no handoff |
| FastAPI `BackgroundTasks` | In-process, no retries, dies with the pod |

## Decision

**Celery 5.6 with a Redis broker** for ingestion, configured for at-least-once delivery:

```
task_ignore_result=True        acks_late=True
task_reject_on_worker_lost=True    autoretry_for=(TransientError,)
retry_backoff=True             max_retries=3
worker_prefetch_multiplier=1
```

One task: `ingest_pdf(pdf_id)`.

Celery's synchronous model costs nothing here because the ingestion path is synchronous code
(pypdf, Voyage, Pinecone and psycopg sync clients). Taskiq would be the right answer for an
all-async pipeline; this project has none. arq is excluded by its maintenance status,
`BackgroundTasks` by durability.

**Chat generation is not queued.** It runs inside the API process and streams straight to the
client. Streaming through a broker needs a token relay (Redis Streams or pub/sub) and a second
network hop: it adds latency and two failure modes for no scaling benefit at this size. LLM
calls are I/O-bound and the event loop already handles concurrent streams.

## Consequences

- A second Deployment (`docchat-worker`) running the same image.
- Ingestion status lives in `pdfs.status`, not in a Celery result backend.
- The `TaskQueue` port keeps Celery out of the services; `InlineQueue` makes tests synchronous.

## Reversal

Implement `TaskiqQueue` against the same port. The task body is framework-agnostic:
`IngestionService.run(pdf_id)`.
