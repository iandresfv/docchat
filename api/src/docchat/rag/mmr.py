"""Maximal Marginal Relevance: pick chunks that are relevant to the query and unlike each other.

Similarity search alone often returns near-duplicates (the overlap between neighbouring chunks
guarantees some). MMR trades a little relevance for coverage. It runs on what any `VectorIndex`
returns with `include_embeddings=True`, so every adapter gets it.
"""

from collections.abc import Sequence

import numpy as np

from docchat.ports.vector_index import ScoredChunk


def mmr(
    candidates: Sequence[ScoredChunk], *, k: int, lambda_mult: float = 0.5
) -> list[ScoredChunk]:
    """Choose `k` of `candidates` greedily, each maximising

        lambda_mult * relevance - (1 - lambda_mult) * (max similarity to the ones already chosen)

    where relevance is the score the index returned. `lambda_mult=1` is plain similarity order;
    `0` is maximum diversity.
    """
    if not 0 <= lambda_mult <= 1:
        raise ValueError("lambda_mult must be between 0 and 1")
    if not candidates or k <= 0:
        return []
    if any(c.chunk.embedding is None for c in candidates):
        raise ValueError("mmr needs embeddings: search with include_embeddings=True")

    vectors = np.array([c.chunk.embedding for c in candidates], dtype=np.float64)
    vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)
    similarity = vectors @ vectors.T  # cosine between every pair of candidates
    relevance = np.array([c.score for c in candidates])

    chosen: list[int] = []
    redundancy = np.full(len(candidates), -np.inf)  # max similarity to anything chosen so far
    while len(chosen) < min(k, len(candidates)):
        penalty = np.where(np.isinf(redundancy), 0.0, redundancy)
        value = lambda_mult * relevance - (1 - lambda_mult) * penalty
        value[chosen] = -np.inf
        best = int(np.argmax(value))  # first index wins a tie: keeps the index's order
        chosen.append(best)
        redundancy = np.maximum(redundancy, similarity[best])
    return [candidates[i] for i in chosen]
