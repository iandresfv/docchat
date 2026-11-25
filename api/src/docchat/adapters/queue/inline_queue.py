"""`TaskQueue` without a broker: the ingestion runs at once, in the caller. For tests."""

from collections.abc import Callable
from uuid import UUID, uuid4


class InlineQueue:
    def __init__(self, ingest: Callable[[UUID, str], object]) -> None:
        self._ingest = ingest

    def enqueue_ingestion(self, pdf_id: UUID, storage_key: str) -> str:
        self._ingest(pdf_id, storage_key)
        return f"inline-{uuid4()}"
