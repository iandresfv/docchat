"""`TaskQueue` on Celery: the task goes to Redis and a worker process picks it up."""

from uuid import UUID

from celery import Celery
from kombu.exceptions import OperationalError

from docchat.core.errors import UpstreamUnavailable
from docchat.worker.celery_app import INGEST_PDF_TASK


class CeleryQueue:
    def __init__(self, app: Celery) -> None:
        self._app = app

    def enqueue_ingestion(self, pdf_id: UUID, storage_key: str) -> str:
        # Sent by name, so the sender never imports the task's code. Arguments travel as JSON,
        # which has no UUID type.
        try:
            result = self._app.send_task(INGEST_PDF_TASK, args=[str(pdf_id), storage_key])
        except OperationalError as exc:
            raise UpstreamUnavailable(f"The task queue is unreachable: {exc}") from exc
        return result.id
