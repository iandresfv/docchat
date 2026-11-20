"""The vector store: chunks with their embeddings, searched by similarity within one PDF."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Chunk:
    id: str  # f"{pdf_id}:{page:04d}:{ordinal:04d}", see rag/chunking.py
    pdf_id: UUID
    page: int
    ordinal: int
    text: str
    embedding: list[float] | None = None


@dataclass(frozen=True, slots=True)
class ScoredChunk:
    chunk: Chunk
    score: float  # cosine similarity to the query; higher is closer


class VectorIndex(Protocol):
    def upsert(self, chunks: Sequence[Chunk]) -> None:
        """Insert or replace by `chunk.id`. Every chunk must carry its embedding."""
        ...

    def delete_pdf(self, pdf_id: UUID) -> None: ...

    def search(
        self,
        query_embedding: Sequence[float],
        *,
        pdf_id: UUID,
        k: int,
        include_embeddings: bool = False,
    ) -> list[ScoredChunk]:
        """The `k` chunks of `pdf_id` most similar to the query, closest first.

        `include_embeddings` returns each chunk's vector, which MMR needs (rag/mmr.py).
        """
        ...

    def count(self, pdf_id: UUID) -> int: ...

    def healthcheck(self) -> bool: ...
