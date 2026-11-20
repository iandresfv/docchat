import io
from collections.abc import Callable, Sequence
from pathlib import Path
from uuid import UUID

import pytest
from langchain_core.embeddings import DeterministicFakeEmbedding

from docchat.adapters.pdf.pypdf_extractor import PypdfExtractor
from docchat.adapters.storage.fs_storage import FsStorage
from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.core.errors import UpstreamUnavailable
from docchat.core.settings import Settings
from docchat.services.ingestion_service import IngestionResult, IngestionService

PDF_ID = UUID("00000000-0000-4000-8000-000000000001")
KEY = f"pdfs/u1/{PDF_ID}.pdf"


class LaggingIndex(InMemoryIndex):
    """An eventually consistent index that never catches up."""

    def count(self, pdf_id: UUID) -> int:
        return 0


class FakeTime:
    """sleep() moves the clock forward instantly, so the timeout test takes no real time."""

    def __init__(self) -> None:
        self.now = 0.0

    def sleep(self, seconds: float) -> None:
        self.now += seconds

    def clock(self) -> float:
        return self.now


def make_service(
    tmp_path: Path, index: InMemoryIndex, settings: Settings
) -> tuple[IngestionService, FsStorage]:
    storage = FsStorage(tmp_path)
    service = IngestionService(
        storage=storage,
        extractor=PypdfExtractor(),
        embeddings=DeterministicFakeEmbedding(size=8),
        index=index,
        settings=settings,
        sleep=(time := FakeTime()).sleep,
        clock=time.clock,
    )
    return service, storage


def store(storage: FsStorage, pdf: bytes) -> None:
    storage.put(KEY, io.BytesIO(pdf), content_type="application/pdf", size=len(pdf))


def test_indexes_every_chunk_with_its_page(
    tmp_path: Path, settings: Settings, make_pdf: Callable[[Sequence[str]], bytes]
) -> None:
    index = InMemoryIndex()
    service, storage = make_service(tmp_path, index, settings)
    store(storage, make_pdf(["Celery runs ingestion.", "", "Pinecone stores vectors."]))

    result = service.run(PDF_ID, KEY)

    assert result == IngestionResult(PDF_ID, page_count=3, chunk_count=2)
    assert index.count(PDF_ID) == 2
    query = DeterministicFakeEmbedding(size=8).embed_query("Pinecone stores vectors.")
    hits = index.search(query, pdf_id=PDF_ID, k=2)
    assert {(hit.chunk.page, hit.chunk.text) for hit in hits} == {
        (1, "Celery runs ingestion."),
        (3, "Pinecone stores vectors."),
    }


def test_running_again_replaces_the_previous_chunks(
    tmp_path: Path, settings: Settings, make_pdf: Callable[[Sequence[str]], bytes]
) -> None:
    index = InMemoryIndex()
    service, storage = make_service(tmp_path, index, settings)
    store(storage, make_pdf(["One.", "Two.", "Three."]))
    service.run(PDF_ID, KEY)

    store(storage, make_pdf(["Only one page now."]))
    result = service.run(PDF_ID, KEY)

    assert result.chunk_count == 1
    assert index.count(PDF_ID) == 1


def test_fails_when_the_index_never_shows_every_chunk(
    tmp_path: Path, settings: Settings, make_pdf: Callable[[Sequence[str]], bytes]
) -> None:
    service, storage = make_service(tmp_path, LaggingIndex(), settings)
    store(storage, make_pdf(["Some text."]))

    with pytest.raises(UpstreamUnavailable, match="0 of 1 chunks after 10 s"):
        service.run(PDF_ID, KEY)
