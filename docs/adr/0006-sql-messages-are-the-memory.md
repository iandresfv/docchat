# ADR-0006 — Conversation memory: SQL messages are the source of truth

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Messages must be persisted for the UI, for exports and for evaluation regardless of what the
graph does. `AsyncPostgresSaver` 3.1.2 works, but it writes the full graph state on every
super-step, has no TTL, and would duplicate what the UI already needs.

## Options considered

Checkpointer only / SQL messages only / both.

## Decision

SQL only. A `MemoryStrategy` (`rag/components/memories.py`) is a pure function:

```python
build(messages: list[Message], summary: str | None) -> list[BaseMessage]
```

The three arms — `buffer`, `window_6`, `summary` — differ only in that function. The graph is
invoked statelessly per turn with the shaped history. The `summary` arm keeps
`conversations.summary` and `summary_upto_seq`, refreshed every four turns by a cheap model
call accounted to the conversation.

## Consequences

One table to query for the UI, exports and evals; no checkpoint growth; the memory arms are
trivially unit-testable. Time-travel and replay of graph state are lost, and nothing needs them.

## Reversal

Add `AsyncPostgresSaver` with `thread_id=conversation_id` if a multi-step agent ever needs
mid-turn state; SQL messages stay as the UI's source.
