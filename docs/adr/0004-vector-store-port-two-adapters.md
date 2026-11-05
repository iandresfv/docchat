# ADR-0004 — Vector store: one port, two adapters, pgvector by default

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Verified 2026-10-11:

- **Pinecone Starter** — 5 serverless indexes, 2 GB, 100 namespaces per index, 1M read units
  and 2M write units per month, `us-east-1` only, `delete(filter=...)` supported on serverless.
- **`langchain-pinecone` 0.2.13** — last released 2025-11 and pins `pinecone<8` while the SDK
  is at 10.0.
- **pgvector 0.8.7** — HNSW supports up to 2000 dimensions.
- **Qdrant 1.19.**

## Options considered

Pinecone only / pgvector only / Qdrant in-cluster / a port with two adapters.

## Decision

A `VectorIndex` port with two adapters, both written against the vendor SDKs directly
(`pinecone` 10.x; SQLAlchemy plus the `pgvector` 0.5.1 type) rather than through the LangChain
integration packages, which lag the SDKs.

`VECTOR_STORE=pgvector` is the default — it works offline, in CI and in a demo without Wi-Fi.
`pinecone` is the managed story. MMR lives in `rag/mmr.py` over the returned embeddings, so
both adapters support every retriever arm.

Qdrant was rejected: a third stateful service with no upside over pgvector at ~10k vectors.

**Does the abstraction earn its keep?** Measurably. The port is five methods. Without it, CI
would need network access and a Pinecone key, the demo would die without Wi-Fi, and the
retriever axis of the experiment would be entangled with a vendor class. The cost is one
~120-line adapter per backend.

## Consequences

- The Pinecone index is created once (1024 dimensions, cosine, serverless `aws/us-east-1`) and
  documented in the runbook.
- pgvector adds a `chunks` table and an HNSW index to the schema.
- Consistency differs: Pinecone is eventually consistent, so ingestion marks a PDF `ready` only
  after `count(pdf_id)` reaches the expected number, with a bounded 10-second wait.

## Reversal

Delete an adapter. Nothing else references it.
