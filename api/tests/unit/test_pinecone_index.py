from collections.abc import Iterator
from types import SimpleNamespace
from typing import Any, cast
from uuid import UUID

import pytest
from pinecone import Index
from pinecone.errors import PineconeConnectionError

from docchat.adapters.vector.pinecone_index import PineconeIndex
from docchat.ports.vector_index import Chunk

PDF_ID = UUID("00000000-0000-4000-8000-000000000001")
ONLY_THIS_PDF = {"pdf_id": {"$eq": str(PDF_ID)}}


class FakeDataPlane:
    """Records the calls the adapter makes and answers like the Pinecone SDK would."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.matches: list[SimpleNamespace] = []
        self.id_pages: list[list[str]] = []
        self.healthy = True

    def upsert(self, **kwargs: Any) -> None:
        self.calls.append(("upsert", kwargs))

    def delete(self, **kwargs: Any) -> None:
        self.calls.append(("delete", kwargs))

    def query(self, **kwargs: Any) -> SimpleNamespace:
        self.calls.append(("query", kwargs))
        return SimpleNamespace(matches=self.matches)

    def list(self, **kwargs: Any) -> Iterator[list[str]]:
        self.calls.append(("list", kwargs))
        yield from self.id_pages

    def describe_index_stats(self) -> None:
        if not self.healthy:
            raise PineconeConnectionError("unreachable")


@pytest.fixture
def plane() -> FakeDataPlane:
    return FakeDataPlane()


@pytest.fixture
def index(plane: FakeDataPlane) -> PineconeIndex:
    return PineconeIndex(cast(Index, plane))


def chunk(ordinal: int) -> Chunk:
    return Chunk(f"{PDF_ID}:0002:{ordinal:04d}", PDF_ID, 2, ordinal, f"text {ordinal}", [0.5, 0.5])


def test_upserts_in_batches_of_at_most_one_hundred(
    index: PineconeIndex, plane: FakeDataPlane
) -> None:
    index.upsert([chunk(n) for n in range(250)])

    assert [len(kwargs["vectors"]) for _, kwargs in plane.calls] == [100, 100, 50]
    assert plane.calls[0][1]["vectors"][0] == {
        "id": f"{PDF_ID}:0002:0000",
        "values": [0.5, 0.5],
        "metadata": {"pdf_id": str(PDF_ID), "page": 2, "ordinal": 0, "text": "text 0"},
    }


def test_search_filters_on_the_pdf_and_rebuilds_chunks(
    index: PineconeIndex, plane: FakeDataPlane
) -> None:
    metadata = {"pdf_id": str(PDF_ID), "page": 2.0, "ordinal": 7.0, "text": "text 7"}
    plane.matches = [
        SimpleNamespace(id=f"{PDF_ID}:0002:0007", score=0.83, metadata=metadata, values=[])
    ]

    results = index.search([0.1, 0.2], pdf_id=PDF_ID, k=4)

    assert plane.calls == [
        (
            "query",
            {
                "vector": [0.1, 0.2],
                "top_k": 4,
                "filter": ONLY_THIS_PDF,
                "include_metadata": True,
                "include_values": False,
            },
        )
    ]
    assert results[0].chunk == Chunk(f"{PDF_ID}:0002:0007", PDF_ID, 2, 7, "text 7", None)
    assert results[0].score == 0.83


def test_delete_pdf_deletes_by_metadata_filter(index: PineconeIndex, plane: FakeDataPlane) -> None:
    index.delete_pdf(PDF_ID)

    assert plane.calls == [("delete", {"filter": ONLY_THIS_PDF})]


def test_count_lists_ids_by_the_pdf_prefix(index: PineconeIndex, plane: FakeDataPlane) -> None:
    plane.id_pages = [["a", "b", "c"], ["d"]]

    assert index.count(PDF_ID) == 4
    assert plane.calls == [("list", {"prefix": f"{PDF_ID}:"})]


def test_healthcheck_is_false_when_pinecone_is_unreachable(
    index: PineconeIndex, plane: FakeDataPlane
) -> None:
    assert index.healthcheck() is True
    plane.healthy = False
    assert index.healthcheck() is False
