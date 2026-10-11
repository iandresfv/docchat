# DocChat

> Chat with your PDFs — and measure which RAG setup actually works.

DocChat is a multi-tenant web app where you upload PDFs and hold cited conversations about them. Every conversation is assigned an `(llm, retriever, memory)` combination; ratings on answers feed back into the choice, so the app measures which RAG setup works best.

## Repository layout

| Path | What |
|---|---|
| `api/` | FastAPI backend, Celery worker, RAG pipeline (LangChain + LangGraph) |
| `client/` | React 19 SPA (Vite, Tailwind 4, shadcn/ui) |
| `deploy/` | Kustomize base/overlays and docker compose |
| `adr/` | Architecture decision records |

## Stage map

| Milestone | Backend | Client | Tag |
|---|---|---|---|
| M0 | S0 Foundation | F0 Scaffold | v0.1.0 |
| M1 | S1 Ingestion core | — | v0.2.0 |
| M2 | S2 Worker + cluster | — | v0.3.0 |
| M3 | S3 Web domain | F1 Auth, F2 Library | v0.4.0 |
| M4 | S4 Chat pipeline | F3 Workspace | v0.5.0 |
| M5 | S5 Streaming | F4 Streaming | v0.6.0 |
| M6 | S6 Memory strategies | — | v0.7.0 |
| M7 | S7 Experiments | F5 Experiments | v0.8.0 |
| M8 | S8 Observability | — | v0.9.0 |
| M9 | S9 Hardening | F6 Ship | v1.0.0 |

## License

[MIT](LICENSE)
