"""Ingest one stored PDF: extract → chunk → embed → upsert. See 01-ARCHITECTURE §8.1."""

import time
from collections.abc import Callable
from dataclasses import dataclass
from itertools import batched
from uuid import UUID

import structlog
from langchain_core.embeddings import Embeddings

from docchat.core.errors import UpstreamUnavailable
from docchat.core.settings import Settings
from docchat.ports.object_storage import ObjectStorage
from docchat.ports.pdf_extractor import PdfExtractor
from docchat.ports.vector_index import Chunk, VectorIndex
from docchat.rag.chunking import chunk_pages

logger = structlog.get_logger("docchat.ingestion")

# One embeddings request and one upsert per 100 chunks.
BATCH_SIZE = 100
# Pinecone is eventually consistent: wait this long for every chunk to be searchable. ADR-0004.
CONSISTENCY_TIMEOUT_SECONDS = 10.0
POLL_INTERVAL_SECONDS = 0.5


@dataclass(frozen=True, slots=True)
class IngestionResult:
    pdf_id: UUID
    page_count: int
    chunk_count: int


class IngestionService:
    def __init__(
        self,
        *,
        storage: ObjectStorage,
        extractor: PdfExtractor,
        embeddings: Embeddings,
        index: VectorIndex,
        settings: Settings,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._storage = storage
        self._extractor = extractor
        self._embeddings = embeddings
        self._index = index
        self._settings = settings
        self._sleep = sleep
        self._clock = clock

    def run(self, pdf_id: UUID, key: str) -> IngestionResult:
        """Index the PDF stored under `key`. Running it again replaces the previous result."""
        log = logger.bind(pdf_id=str(pdf_id))
        with self._storage.open(key) as file:
            pages = self._extractor.extract(file, max_pages=self._settings.max_pdf_pages)
        chunks = chunk_pages(
            pdf_id, pages, size=self._settings.chunk_size, overlap=self._settings.chunk_overlap
        )
        log.info("ingestion.chunked", pages=len(pages), chunks=len(chunks))

        # Old vectors go first, so a shorter new version leaves none behind.
        self._index.delete_pdf(pdf_id)
        for batch in batched(chunks, BATCH_SIZE, strict=False):
            vectors = self._embeddings.embed_documents([chunk.text for chunk in batch])
            self._index.upsert(
                [
                    Chunk(c.id, pdf_id, c.page, c.ordinal, c.text, vector)
                    for c, vector in zip(batch, vectors, strict=True)
                ]
            )
        self._wait_until_searchable(pdf_id, expected=len(chunks))
        log.info("ingestion.done", chunks=len(chunks))
        return IngestionResult(pdf_id, len(pages), len(chunks))

    def _wait_until_searchable(self, pdf_id: UUID, *, expected: int) -> None:
        deadline = self._clock() + CONSISTENCY_TIMEOUT_SECONDS
        while (count := self._index.count(pdf_id)) != expected:
            if self._clock() >= deadline:
                raise UpstreamUnavailable(
                    f"The vector index shows {count} of {expected} chunks after "
                    f"{CONSISTENCY_TIMEOUT_SECONDS:g} s."
                )
            self._sleep(POLL_INTERVAL_SECONDS)
