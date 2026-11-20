from uuid import UUID

import pytest

from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.ports.vector_index import Chunk

PDF_A = UUID("00000000-0000-4000-8000-00000000000a")
PDF_B = UUID("00000000-0000-4000-8000-00000000000b")


def chunk(pdf_id: UUID, ordinal: int, embedding: list[float]) -> Chunk:
    return Chunk(f"{pdf_id}:0001:{ordinal:04d}", pdf_id, 1, ordinal, f"text {ordinal}", embedding)


@pytest.fixture
def index() -> InMemoryIndex:
    index = InMemoryIndex()
    index.upsert(
        [
            chunk(PDF_A, 0, [1.0, 0.0]),
            chunk(PDF_A, 1, [0.6, 0.8]),
            chunk(PDF_A, 2, [0.0, 1.0]),
            chunk(PDF_B, 0, [1.0, 0.0]),
        ]
    )
    return index


def test_search_ranks_by_cosine_within_one_pdf(index: InMemoryIndex) -> None:
    results = index.search([2.0, 0.0], pdf_id=PDF_A, k=3)

    assert [r.chunk.ordinal for r in results] == [0, 1, 2]
    assert [round(r.score, 6) for r in results] == [1.0, 0.6, 0.0]
    assert {r.chunk.pdf_id for r in results} == {PDF_A}


def test_search_returns_embeddings_only_when_asked(index: InMemoryIndex) -> None:
    assert index.search([1.0, 0.0], pdf_id=PDF_A, k=1)[0].chunk.embedding is None
    with_vectors = index.search([1.0, 0.0], pdf_id=PDF_A, k=1, include_embeddings=True)
    assert with_vectors[0].chunk.embedding == [1.0, 0.0]


def test_upsert_replaces_by_id(index: InMemoryIndex) -> None:
    index.upsert([chunk(PDF_A, 0, [0.0, 1.0])])

    assert index.count(PDF_A) == 3
    assert index.search([0.0, 1.0], pdf_id=PDF_A, k=1)[0].score == pytest.approx(1.0)


def test_delete_pdf_leaves_other_pdfs(index: InMemoryIndex) -> None:
    index.delete_pdf(PDF_A)

    assert index.count(PDF_A) == 0
    assert index.search([1.0, 0.0], pdf_id=PDF_A, k=4) == []
    assert index.count(PDF_B) == 1


def test_upsert_rejects_a_chunk_without_embedding() -> None:
    with pytest.raises(ValueError, match="no embedding"):
        InMemoryIndex().upsert([Chunk("x", PDF_A, 1, 0, "text")])
