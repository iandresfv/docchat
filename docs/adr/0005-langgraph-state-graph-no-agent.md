# ADR-0005 — Orchestration: a LangGraph state graph, not an agent, not the raw SDK

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Verified: LangChain 1.4.4, langgraph 1.2.14. Legacy chains now live in `langchain-classic`;
`RunnableWithMessageHistory` was deprecated in 1.3.3 in favour of LangGraph persistence; the
documentation recommends `create_agent` with a retriever tool for RAG with memory.

## Options considered

1. `create_agent` with a retrieval tool.
2. An explicit `StateGraph`.
3. A plain LCEL chain.
4. The Anthropic SDK directly.

## Decision

Option 2: a three-node `StateGraph` — `condense → retrieve → generate` — built from LCEL pieces
(`ChatPromptTemplate | model`) and streamed with `astream(stream_mode=["messages", "custom"])`.

This is a fixed pipeline where *every* turn must retrieve. An agent that may decide not to call
the tool makes the retriever-arm comparison meaningless. The graph also gives typed state,
node-level tracing, per-node streaming, and a clean place to emit the `sources` event.

Option 3 cannot emit intermediate events cleanly. Option 4 forfeits model swapping, callbacks
and message types for marginal control.

**The line drawn.** LangChain supplies models, embeddings, messages, prompts, `trim_messages`
and text splitters. LangGraph supplies the graph, streaming and `get_stream_writer`. The
Anthropic SDK is never called directly: provider-specific features reach through
`langchain-anthropic` (`cache_control` content blocks, `usage_metadata.input_token_details`).

`create_agent` is reserved for a post-1.0 "ask across all my documents" feature.

## Consequences

`rag/` is roughly 300 lines and contains no deprecated API.

## Reversal

Swap `graph.py` for `create_agent(...)`; the services call the same `ChatPipeline.astream()`
facade either way.
