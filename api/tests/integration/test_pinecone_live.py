"""Against the real Pinecone index. Run with `make test-external`; skipped without a key."""

import os
import random
import time
from uuid import UUID, uuid4

import pytest

from docchat.adapters.vector.pinecone_index import PineconeIndex
from docchat.ports.vector_index import Chunk

pytestmark = [
    pytest.mark.external,
    pytest.mark.skipif(not os.environ.get("PINECONE_API_KEY"), reason="PINECONE_API_KEY not set"),
]

DIMENSIONS = 1024


def random_unit_vector(rng: random.Random) -> list[float]:
    vector = [rng.gauss(0, 1) for _ in range(DIMENSIONS)]
    norm = sum(x * x for x in vector) ** 0.5
    return [x / norm for x in vector]


def wait_for_count(index: PineconeIndex, pdf_id: UUID, expected: int) -> int:
    deadline = time.monotonic() + 30
    while (count := index.count(pdf_id)) != expected and time.monotonic() < deadline:
        time.sleep(1)
    return count


def test_round_trip_scoped_to_one_pdf() -> None:
    index = PineconeIndex.connect(
        api_key=os.environ["PINECONE_API_KEY"],
        index_name=os.environ.get("PINECONE_INDEX_NAME", "docchat"),
    )
    rng = random.Random(7)
    pdf_id, other_pdf_id = uuid4(), uuid4()
    chunks = [
        Chunk(f"{pdf_id}:0001:{n:04d}", pdf_id, 1, n, f"chunk {n}", random_unit_vector(rng))
        for n in range(3)
    ]
    other = Chunk(f"{other_pdf_id}:0001:0000", other_pdf_id, 1, 0, "other", chunks[0].embedding)
    try:
        index.upsert([*chunks, other])
        assert wait_for_count(index, pdf_id, 3) == 3
        assert index.healthcheck()

        assert chunks[0].embedding is not None
        results = index.search(chunks[0].embedding, pdf_id=pdf_id, k=5, include_embeddings=True)

        # `other` has the very same vector, but belongs to another PDF and is filtered out.
        assert {r.chunk.pdf_id for r in results} == {pdf_id}
        assert results[0].chunk.id == chunks[0].id
        assert results[0].chunk.text == "chunk 0"
        assert results[0].chunk.embedding is not None
        assert len(results[0].chunk.embedding) == DIMENSIONS
        assert results[0].score == pytest.approx(1.0, abs=1e-3)
    finally:
        index.delete_pdf(pdf_id)
        index.delete_pdf(other_pdf_id)
    assert wait_for_count(index, pdf_id, 0) == 0
