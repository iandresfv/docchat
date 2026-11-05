# ADR-0008 — Observability: Langfuse for traces, Prometheus for metrics, no OTel collector yet

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Verified: self-hosting Langfuse v3 requires ClickHouse, Redis, S3 and Postgres (~16–20 GiB);
the Langfuse SDK v4 is OpenTelemetry-based and can export to another OTLP endpoint; Jaeger v2
all-in-one is the light trace backend if one is ever needed;
`prometheus-fastapi-instrumentator` 8.1 is maintained.

## Decision

**Traces (LLM level).** Langfuse Cloud through `CallbackHandler`, with
`propagate_attributes(user_id, session_id=conversation_id, tags=[llm, retriever, memory],
metadata={pdf_id})`. Self-hosting is documented as the production path, not run locally.

**Metrics.** A `/metrics` endpoint with standard HTTP metrics plus:

```
docchat_llm_tokens_total{model,kind}      docchat_llm_cost_usd_total{model}
docchat_llm_latency_seconds{model,phase}  docchat_ttft_seconds
docchat_retrieval_seconds{backend}        docchat_ingestion_seconds
docchat_ingestion_total{status}           docchat_scores_total{llm,retriever,memory,value}
docchat_budget_rejections_total{scope}    docchat_sse_active_streams
```

Scraped by an optional Kustomize component (Prometheus + Grafana) with two dashboards:
"API & ingestion" and "LLM cost & quality".

**Logs.** structlog in JSON with `request_id`, `user_id`, `conversation_id` and `trace_id`.

**Cost per conversation.** Computed in-process from `usage_metadata` against `core/pricing.py`
(a per-model table including cache read and write multipliers), stored per message, summed per
conversation, user and day, and exposed at `/usage/me` and as a counter. The provider's own cost
view is a cross-check, not the source of truth.

## Rejected

Self-hosted Langfuse (memory footprint), a full OTel collector with Jaeger (a second tracing
system showing nothing Langfuse does not), and kube-prometheus-stack (heavy). OTel export is one
`BatchSpanProcessor` away if a collector is added later.

## Reversal

Point `LANGFUSE_HOST` at a self-hosted URL; add Jaeger through the SDK's TracerProvider.
