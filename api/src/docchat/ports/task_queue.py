"""Background work. Only ingestion is queued; chat runs in the API process. See ADR-0002."""

from typing import Protocol
from uuid import UUID


class TaskQueue(Protocol):
    def enqueue_ingestion(self, pdf_id: UUID, storage_key: str) -> str:
        """Ask for the stored PDF to be ingested and return the task id at once.

        Delivery is at least once: the ingestion may run twice, so it must be idempotent.
        """
        ...
