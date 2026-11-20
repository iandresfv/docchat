from uuid import UUID

import pytest
from hypothesis import given
from hypothesis import strategies as st

from docchat.ports.vector_index import Chunk, ScoredChunk
from docchat.rag.mmr import mmr

PDF_ID = UUID("00000000-0000-4000-8000-000000000001")


def scored(ordinal: int, embedding: list[float], score: float) -> ScoredChunk:
    chunk = Chunk(f"{PDF_ID}:0001:{ordinal:04d}", PDF_ID, 1, ordinal, "", embedding)
    return ScoredChunk(chunk, score)


# Candidates as an index returns them: distinct ids, non-zero vectors, closest first.
vector = st.lists(st.floats(-1, 1, allow_nan=False), min_size=4, max_size=4).filter(
    lambda v: sum(x * x for x in v) > 1e-6
)
candidate_lists = st.lists(
    st.tuples(vector, st.floats(-1, 1, allow_nan=False)), min_size=1, max_size=20
).map(
    lambda rows: [
        scored(i, embedding, score)
        for i, (embedding, score) in enumerate(sorted(rows, key=lambda row: -row[1]))
    ]
)
lambdas = st.floats(0, 1, allow_nan=False)


@given(candidate_lists, st.integers(1, 25), lambdas)
def test_returns_min_k_n_distinct_candidates(
    candidates: list[ScoredChunk], k: int, lambda_mult: float
) -> None:
    chosen = mmr(candidates, k=k, lambda_mult=lambda_mult)

    ids = [c.chunk.id for c in chosen]
    assert len(ids) == min(k, len(candidates))
    assert len(set(ids)) == len(ids)
    assert set(ids) <= {c.chunk.id for c in candidates}


@given(candidate_lists, st.integers(1, 25))
def test_lambda_one_is_plain_similarity_order(candidates: list[ScoredChunk], k: int) -> None:
    assert mmr(candidates, k=k, lambda_mult=1.0) == candidates[:k]


@given(candidate_lists, st.floats(0.01, 1, allow_nan=False))
def test_the_most_relevant_candidate_is_always_chosen_first(
    candidates: list[ScoredChunk], lambda_mult: float
) -> None:
    assert mmr(candidates, k=1, lambda_mult=lambda_mult)[0] == candidates[0]


def test_skips_a_near_duplicate_in_favour_of_a_different_chunk() -> None:
    original = scored(0, [1.0, 0.0], 0.95)
    duplicate = scored(1, [1.0, 0.01], 0.94)
    different = scored(2, [0.0, 1.0], 0.70)

    chosen = mmr([original, duplicate, different], k=2, lambda_mult=0.5)

    assert chosen == [original, different]


def test_needs_the_embeddings() -> None:
    no_vector = ScoredChunk(Chunk("x", PDF_ID, 1, 0, ""), 0.9)

    with pytest.raises(ValueError, match="include_embeddings=True"):
        mmr([no_vector], k=1)
