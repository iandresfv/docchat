# ADR-0003 — Ports: four real seams, and what is deliberately not a port

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The backend is layered with consumer-declared interfaces. An interface that exists "for
testability" but has one implementation forever is a cost with no return, so each boundary was
judged on whether a second implementation actually exists.

## Decision

| Boundary | Port? | Reason |
|---|---|---|
| Vector store | **Yes** — `VectorIndex` | Two production adapters with different lifecycles (Pinecone external, pgvector local); CI needs an in-memory fake; it is the "retriever" axis of the experiment |
| Object storage | **Yes** — `ObjectStorage` | S3 (Garage/AWS) vs filesystem for tests and cluster-less work; presigned URLs differ |
| Queue | **Yes** — `TaskQueue` | One method; lets tests run inline and keeps ADR-0002 reversible |
| PDF extraction | **Yes** — `PdfExtractor` | Tiny, but pypdf vs PyMuPDF (AGPL) is a real swap and the fake makes ingestion tests fast |
| LLM provider | **No** | `langchain_core.language_models.BaseChatModel` already is the port; wrapping it again hides streaming, usage metadata and callbacks. `rag/components/llms.py` is the only place that names `ChatAnthropic` |
| Embeddings | **No** | Same reasoning with `langchain_core.embeddings.Embeddings` |
| Tracing | **No** | Langfuse is a LangChain callback plus env vars; a `Tracer` protocol would be a second abstraction over OpenTelemetry, which the Langfuse SDK already is |
| Repositories | **No protocol** | Concrete classes; integration tests run Postgres through testcontainers |
| Rate limiting / budgets | **No** | Redis is assumed; `BudgetService` is one class with a `fake` flag for tests |

One addition beyond the reference: `rag/` is isolated from both HTTP and SQL, so the graph can
be driven from the CLI and from the eval runner.

This is **not** hexagonal architecture: there is no domain entity layer separate from the ORM
models, no application/infrastructure split, and no DI container.

## Reversal

Promoting any "No" to a port is additive and touches one call site.
