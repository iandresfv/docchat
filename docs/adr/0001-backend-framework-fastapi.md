# ADR-0001 — Backend framework: FastAPI

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The reference implementation this project is modelled on uses Flask 3 (synchronous). The
backend here streams LLM tokens over SSE and shares a type system with the RAG layer, so the
framework choice is not neutral.

## Options considered

| Option | Notes |
|---|---|
| Flask 3 | Matches the reference, synchronous, SSE via generators |
| Litestar | Async, excellent DI and typing, smaller community |
| Django + DRF | Batteries included, heavy, sync-first ORM |
| **FastAPI 0.143** | Async, Pydantic v2 native, OpenAPI generated |

## Decision

FastAPI, for four reasons that outlive the "AI ecosystem" argument:

1. SSE streaming of LLM tokens is naturally async and must not block a worker thread per
   connected client.
2. Pydantic v2 is already the schema language of LangChain, `pydantic-settings` and the HTTP
   layer — one type system end to end.
3. OpenAPI is generated from the code, which replaces a hand-maintained spec with a snapshot
   test.
4. `Depends()` is enough dependency injection to wire the ports without a container.

Litestar is the only materially comparable option and loses on ecosystem recognisability.

## Consequences

Everything in the request path is `async`; SQLAlchemy 2.x async engine with psycopg 3;
synchronous SDK calls (Pinecone, boto3, pypdf) run in the Celery worker or through
`run_in_threadpool`.

## Reversal

Services and `rag/` contain no FastAPI imports; only the `api/` layer would be rewritten.
