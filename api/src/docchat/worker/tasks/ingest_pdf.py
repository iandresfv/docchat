"""`ingest_pdf`: the worker indexes one stored PDF, retrying the failures that may pass."""

from typing import Any
from uuid import UUID

import structlog
from billiard.einfo import ExceptionInfo
from celery import Task
from pinecone.errors import PineconeConnectionError, PineconeTimeoutError, ServiceError
from pinecone.errors import RateLimitError as PineconeRateLimitError
from voyageai import error as voyage

from docchat.core.errors import AppError, UpstreamUnavailable
from docchat.core.settings import get_settings
from docchat.wiring import build_ingestion_service
from docchat.worker.celery_app import INGEST_PDF_TASK, celery_app

logger = structlog.get_logger("docchat.worker")

MAX_RETRIES = 3

# Failures that may pass on their own: an upstream that is busy, rate-limiting or briefly
# unreachable. Anything else (a scanned PDF, a missing key) fails the same way every time, so it
# is not retried.
TRANSIENT_ERRORS: tuple[type[Exception], ...] = (
    UpstreamUnavailable,
    ConnectionError,
    TimeoutError,
    voyage.RateLimitError,
    voyage.ServiceUnavailableError,
    voyage.ServerError,
    voyage.APIConnectionError,
    voyage.Timeout,
    voyage.TryAgain,
    PineconeRateLimitError,
    ServiceError,
    PineconeConnectionError,
    PineconeTimeoutError,
)


def record_status(pdf_id: str, status: str, **details: object) -> None:
    """There is no `pdfs` table yet, so a PDF's status only reaches the log."""
    logger.info("pdf.status", pdf_id=pdf_id, status=status, **details)


class IngestionTask(Task[[str, str], None]):
    """Hooks Celery calls around the task body: before each retry, and once it gives up."""

    def on_retry(
        self,
        exc: Exception,
        task_id: str,
        args: tuple[Any, ...],
        kwargs: dict[str, Any],
        einfo: ExceptionInfo,
    ) -> None:
        logger.warning("ingestion.retry", pdf_id=args[0], error=describe(exc))

    def on_failure(
        self,
        exc: Exception,
        task_id: str,
        args: tuple[Any, ...],
        kwargs: dict[str, Any],
        einfo: ExceptionInfo,
    ) -> None:
        record_status(args[0], "failed", error=describe(exc))


@celery_app.task(
    base=IngestionTask,
    name=INGEST_PDF_TASK,
    autoretry_for=TRANSIENT_ERRORS,
    max_retries=MAX_RETRIES,
    # Exponential backoff with full jitter: a random wait of up to 30, 60 and 120 s before
    # attempts 2, 3 and 4. Rate limits count per minute, so the waits add up to more than one.
    retry_backoff=30,
    retry_backoff_max=120,
    # Failures the app raises on purpose explain themselves: logged in one line, no traceback.
    throws=(AppError,),
)
def ingest_pdf(pdf_id: str, storage_key: str) -> None:
    record_status(pdf_id, "processing")
    # Rerunning is safe: the service deletes the PDF's old vectors before writing new ones.
    result = build_ingestion_service(get_settings()).run(UUID(pdf_id), storage_key)
    record_status(pdf_id, "ready", pages=result.page_count, chunks=result.chunk_count)


def describe(exc: BaseException) -> str:
    return f"{type(exc).__name__}: {exc}"
