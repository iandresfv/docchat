"""`VectorIndex` in a dict, with numpy cosine similarity. For tests: no network, no service."""

from collections.abc import Sequence
from dataclasses import replace
from uuid import UUID

import numpy as np

from docchat.ports.vector_index import Chunk, ScoredChunk


class InMemoryIndex:
    def __init__(self) -> None:
        self._chunks: dict[str, Chunk] = {}

    def upsert(self, chunks: Sequence[Chunk]) -> None:
        for chunk in chunks:
            if chunk.embedding is None:
                raise ValueError(f"chunk {chunk.id} has no embedding")
            self._chunks[chunk.id] = chunk

    def delete_pdf(self, pdf_id: UUID) -> None:
        self._chunks = {id_: c for id_, c in self._chunks.items() if c.pdf_id != pdf_id}

    def search(
        self,
        query_embedding: Sequence[float],
        *,
        pdf_id: UUID,
        k: int,
        include_embeddings: bool = False,
    ) -> list[ScoredChunk]:
        candidates = [chunk for chunk in self._chunks.values() if chunk.pdf_id == pdf_id]
        if not candidates:
            return []
        vectors = np.array([chunk.embedding for chunk in candidates], dtype=np.float64)
        query = np.asarray(query_embedding, dtype=np.float64)
        scores = vectors @ query / (np.linalg.norm(vectors, axis=1) * np.linalg.norm(query))
        results = []
        for i in np.argsort(-scores, kind="stable")[:k]:
            chunk = candidates[i] if include_embeddings else replace(candidates[i], embedding=None)
            results.append(ScoredChunk(chunk, float(scores[i])))
        return results

    def count(self, pdf_id: UUID) -> int:
        return sum(1 for chunk in self._chunks.values() if chunk.pdf_id == pdf_id)

    def healthcheck(self) -> bool:
        return True
