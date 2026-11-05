# ADR-0007 — Evaluation: three proportionate tiers

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

"Which RAG setup actually works" is the product claim, so it needs evidence. Evaluation can
absorb unlimited effort and budget, so each tier had to justify its cost. Verified: the Langfuse
Hobby tier includes datasets, experiments and LLM-as-judge; ragas 0.4.3 supports Anthropic
judges.

## Decision

**Tier 1 — Online.** A thumb per *assistant message* (a `scores` table, mirrored to Langfuse as
`user_feedback`), aggregated per `(llm, retriever, memory)` combination with counts and mean.
The sample size `n` is always shown, so small samples look visibly weak. Pinned conversations
are excluded by default.

**Tier 2 — Offline retrieval.** `api/evals/golden/sample.jsonl` holds
`{question, expected_pages, expected_substrings}` for a committed public-domain PDF.
`docchat eval retrieval --arm mmr_k4` computes hit@k, MRR and nDCG@k per retriever arm. It
spends zero LLM tokens and about 0.05M embedding tokens per run. It runs in CI on pull requests
that touch `api/src/docchat/rag/**` or `evals/**`, against pgvector in a service container, and
fails if hit@4 drops below the threshold stored in `evals/thresholds.json`.

**Tier 3 — Offline generation (LLM-as-judge).** `docchat eval judge` runs the golden set through
the graph as a Langfuse experiment and scores faithfulness and answer relevancy with ragas.
Manual trigger only (`make eval-judge`), roughly 40 questions × 2 calls ≈ US$0.05 per run.

The caveats are recorded in the README rather than hidden: judges are biased toward verbose
answers, the judge belongs to the same model family as the system under test, and there are no
ground-truth answers. Treat tier 3 as a regression smoke test, not as truth.

## Selection policy

ε-greedy per axis, ε = 0.2, with a minimum of 5 scores before an arm counts as "measured"; ties
and under-sampled arms are resolved uniformly.

Rejected: score-weighted random selection (unstable with negative means) and Thompson sampling
(the better tool, but harder to explain in a README — noted as future work).

## Rejected

deepeval (telemetry on by default), per-conversation scoring (ambiguous which answer was being
rated), and Wilson intervals in the UI (misleading below n = 20; show `n` instead).

## Reversal

Each tier is a separate command and table.
