"""`VectorIndex` on Pinecone serverless, on the `pinecone` SDK directly. See ADR-0004.

The index is a classic vector index created once (1024 dimensions, cosine, aws us-east-1). Each
chunk is one vector with metadata `{pdf_id, page, ordinal, text}`; every query and delete filters
on `pdf_id`. Pinecone is eventually consistent: a write shows up in `search` and `count` a few
seconds later, so ingestion waits for `count` before it reports a PDF as indexed.
"""

from collections.abc import Mapping, Sequence
from itertools import batched
from typing import Any, Self
from uuid import UUID

from pinecone import Index, Pinecone
from pinecone.errors import PineconeError

from docchat.core.errors import UpstreamUnavailable
from docchat.ports.vector_index import Chunk, ScoredChunk

# One request takes at most 1000 vectors and 2 MB; 100 vectors of 1024 floats plus their text
# stay far below both.
UPSERT_BATCH_SIZE = 100


class PineconeIndex:
    def __init__(self, index: Index) -> None:
        self._index = index

    @classmethod
    def connect(cls, *, api_key: str, index_name: str) -> Self:
        # One control-plane call to find the index's host; every later call goes to that host.
        host = Pinecone(api_key=api_key).describe_index(index_name).host
        if not host:
            raise UpstreamUnavailable(f"Pinecone index {index_name!r} is still initializing.")
        return cls(Index(host=host, api_key=api_key))

    def upsert(self, chunks: Sequence[Chunk]) -> None:
        for batch in batched(chunks, UPSERT_BATCH_SIZE, strict=False):
            self._index.upsert(vectors=[_to_vector(chunk) for chunk in batch], show_progress=False)

    def delete_pdf(self, pdf_id: UUID) -> None:
        self._index.delete(filter=_only(pdf_id))

    def search(
        self,
        query_embedding: Sequence[float],
        *,
        pdf_id: UUID,
        k: int,
        include_embeddings: bool = False,
    ) -> list[ScoredChunk]:
        response = self._index.query(
            vector=query_embedding,
            top_k=k,
            filter=_only(pdf_id),
            include_metadata=True,
            include_values=include_embeddings,
        )
        return [
            ScoredChunk(
                _to_chunk(match.id, match.metadata, match.values if include_embeddings else None),
                match.score,
            )
            for match in response.matches
        ]

    def count(self, pdf_id: UUID) -> int:
        # Serverless indexes cannot filter stats by metadata, but they list ids by prefix, and
        # every chunk id starts with its pdf_id.
        return sum(len(page) for page in self._index.list(prefix=f"{pdf_id}:"))

    def healthcheck(self) -> bool:
        try:
            self._index.describe_index_stats()
        except PineconeError:
            return False
        return True


def _only(pdf_id: UUID) -> dict[str, Any]:
    return {"pdf_id": {"$eq": str(pdf_id)}}


def _to_vector(chunk: Chunk) -> dict[str, Any]:
    if chunk.embedding is None:
        raise ValueError(f"chunk {chunk.id} has no embedding")
    metadata = {
        "pdf_id": str(chunk.pdf_id),
        "page": chunk.page,
        "ordinal": chunk.ordinal,
        "text": chunk.text,
    }
    return {"id": chunk.id, "values": chunk.embedding, "metadata": metadata}


def _to_chunk(
    id_: str, metadata: Mapping[str, Any] | None, values: Sequence[float] | None
) -> Chunk:
    meta = metadata or {}
    return Chunk(
        id=id_,
        pdf_id=UUID(meta["pdf_id"]),
        page=int(meta["page"]),  # Pinecone returns every number as a float
        ordinal=int(meta["ordinal"]),
        text=str(meta["text"]),
        embedding=list(values) if values else None,
    )
