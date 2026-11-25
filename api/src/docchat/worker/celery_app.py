"""The Celery application. The worker runs it; `CeleryQueue` sends tasks through it. ADR-0002.

Start a worker with `celery -A docchat.worker.celery_app worker -Q ingestion`.
"""

from typing import Any

from celery import Celery, signals

from docchat.core.logging import configure_logging
from docchat.core.settings import Settings, get_settings

INGESTION_QUEUE = "ingestion"
INGEST_PDF_TASK = "docchat.ingest_pdf"


def create_celery_app(settings: Settings) -> Celery:
    app = Celery(
        "docchat",
        broker=settings.celery_broker_url,
        include=["docchat.worker.tasks.ingest_pdf"],
    )
    app.conf.update(
        task_default_queue=INGESTION_QUEUE,
        task_serializer="json",
        accept_content=["json"],
        # The outcome of an ingestion is the PDF's status, not a Celery result.
        task_ignore_result=True,
        # At-least-once delivery: the message is acknowledged after the task finishes, not
        # before, so a worker that dies mid-task hands it back to the broker.
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        # With late acks a lost broker connection redelivers the message anyway; stopping the
        # running copy keeps two from running at once.
        worker_cancel_long_running_tasks_on_connection_loss=True,
        # Each worker process reserves one message at a time: a long PDF holds back no others.
        worker_prefetch_multiplier=1,
        broker_connection_retry_on_startup=True,
    )
    return app


@signals.setup_logging.connect
def use_app_logging(**_: Any) -> None:
    """Replace Celery's own logging setup, so the worker logs like the API."""
    configure_logging(get_settings())


celery_app = create_celery_app(get_settings())
