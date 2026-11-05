# ADR-0010 — Cost and abuse guardrails

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The project runs on a small, fixed prepaid budget, so an unbounded loop or an abusive client is
a real failure mode rather than a theoretical one. Verified prices per million tokens
(input/output): Haiku 5.5 $0.10/$0.50 with cache reads at $0.01; Haiku 4.5 $1/$5 with a minimum
cacheable prefix of 4,096 tokens, which a 3k-token RAG prompt never reaches; Sonnet 5.5 $2/$10.

One answer is about 3.9k input and 400 output tokens, roughly US$0.0006 on Haiku 5.5.

## Decision

**Cheap model first.** `haiku-5-5` is the default and the only enabled arm in `DEFAULT_LLM`.
`sonnet-5-5` stays disabled unless listed in `LLM_ARMS`. `haiku-4-5` is kept as a measured arm
because the comparison is interesting.

**Prompt caching.** One `cache_control` breakpoint on the last history message: the stable
prefix is system plus history, while context and question vary. Hits are expected only on
conversations beyond roughly three turns with `buffer` memory, and
`cache_read_input_tokens` is exported as a metric so the claim is verifiable rather than assumed.

**Budgets.** A per-user daily token budget (Redis, 300k) and a global monthly USD cap (Redis,
$10 by default), both returning `429 budget-exceeded`. Plus
`MAX_MESSAGES_PER_CONVERSATION=100`, `LLM_MAX_OUTPUT_TOKENS=1024` and
`HISTORY_TOKEN_BUDGET=4000` enforced through `trim_messages`.

**Rate limits.** A Redis token bucket implemented in Lua: 10 messages per minute per user, 10
uploads per hour per user, 5 auth attempts per minute per IP. Fails open if Redis is down, and
logs when it does.

**Upload limits.** 20 MB, 200 pages, `application/pdf` magic bytes, one concurrent ingestion per
user.

**Free-tier watch.** Embedding tokens, vector-store read/write units and trace units are tracked
against their monthly allowances, with `LANGFUSE_SAMPLE_RATE` as the pressure valve.

## Reversal

Every number is an environment variable.
