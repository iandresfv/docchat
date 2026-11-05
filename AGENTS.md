# Contributing conventions

Engineering context for anyone working in this repository. Read this before the first change.

## What this is

A RAG application over PDFs: upload a document, ask questions about it, get answers with page
citations, and measure which retrieval and memory configuration actually performs best.

Two applications in one repository. `client/` is a React SPA and is feature-complete. `api/` is
a FastAPI backend and is under construction.

## Ground rules

1. **Read the relevant ADR before changing a design decision.** `docs/adr/` records why each
   choice was made, what was rejected, and what reversing it costs. If a change contradicts a
   record, the change needs a new record that supersedes it — not a silent edit.
2. **`make check` is the contract.** Nothing is considered done until it passes. It runs the
   linter, the type checker and the tests for the application you touched. A change that cannot
   be verified by a command is not finished.
3. **Ports keep vendors out of services.** `VectorIndex`, `ObjectStorage`, `TaskQueue` and
   `PdfExtractor` exist so that no service module imports a vendor SDK. If you need a vendor
   call in a service, you need an adapter instead. See ADR-0003.
4. **`rag/` imports neither HTTP nor SQL.** The graph is driven from the API, from the CLI and
   from the evaluation runner, so it may not depend on any of them.
5. **No deprecated APIs.** This codebase targets LangChain 1.x and LangGraph 1.x. Legacy chains,
   `langchain-community` and `RunnableWithMessageHistory` are out — see ADR-0005.

## Layout

```
api/            FastAPI backend
  src/docchat/
    api/        routers, dependencies, schemas   — HTTP only
    services/   use cases                        — no vendor SDKs, no FastAPI
    rag/        graph, chunking, retrieval, mmr  — no HTTP, no SQL
    ports/      protocols (4)
    adapters/   one implementation per port
    db/         SQLAlchemy models and repositories
    core/       settings, errors, logging, pricing
  evals/        golden set and thresholds
  tests/        unit / integration / contract
client/         React SPA (feature modules + a thin api/ layer)
deploy/k8s/     kustomize base and overlays
docs/adr/       architecture decision records
```

## Conventions

- **Python** — 3.13, `uv` for dependencies, ruff for lint and format, mypy in strict mode.
  Everything in the request path is `async`; synchronous SDK calls go to the worker or through
  `run_in_threadpool`.
- **TypeScript** — strict mode, types generated from the OpenAPI document rather than
  hand-written. Do not edit generated files.
- **Commits** — [Conventional Commits](https://www.conventionalcommits.org). One pull request
  per logical change, squash-merged, at most ~400 changed lines.
- **CHANGELOG** — every pull request adds its own bullet under `[Unreleased]`, in user-facing
  prose, or carries the `skip-changelog` label. CI enforces this.
- **Pull requests** — the description states which roadmap item it implements and which ADR
  governs it. The template has the fields.

## Commands

| Command | What it does |
|---|---|
| `make help` | List every target |
| `make check` | Lint, type-check and test everything (**the gate**) |
| `make install` | Install dependencies for both applications |
| `make run` | Run the API locally with reload |
| `make tilt-up` | Bring the full stack up on minikube |
| `make eval-retrieval` | Score the retriever arms against the golden set |

## Things that look like bugs and are not

- **Chat generation does not go through Celery.** Only ingestion is queued. ADR-0002 explains
  why queueing a token stream would add latency and failure modes for no gain.
- **The default vector store is pgvector, not Pinecone.** The Pinecone adapter exists and is
  tested, but CI and the demo must work without network. ADR-0004.
- **There is no `Tracer` or `LLMProvider` interface.** `BaseChatModel` and the Langfuse callback
  already are those seams; wrapping them again would hide streaming and usage metadata.
  ADR-0003.
- **Rate limiting fails open.** If Redis is unreachable the request proceeds and the event is
  logged. Availability beats enforcement for this workload. ADR-0010.
