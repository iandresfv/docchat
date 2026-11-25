"""`CeleryQueue` → broker → worker → `ingest_pdf`, all in this process.

Kombu's in-memory transport stands in for Redis and a worker runs in a thread, so the message
takes the real path: the task is found by name and its arguments survive JSON.
"""

import io
import time
from collections.abc import Callable, Sequence
from pathlib import Path
from uuid import UUID

import pytest
from celery.contrib.testing.worker import start_worker

from docchat.adapters.queue.celery_queue import CeleryQueue
from docchat.adapters.storage.fs_storage import FsStorage
from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.core.settings import Settings
from docchat.ports.vector_index import VectorIndex
from docchat.services.ingestion_service import IngestionService
from docchat.worker.celery_app import celery_app
from docchat.worker.tasks import ingest_pdf as task

PDF_ID = UUID("00000000-0000-4000-8000-000000000003")
KEY = f"pdfs/cli/{PDF_ID}.pdf"


def test_a_queued_pdf_is_indexed_by_the_worker(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    make_pdf: Callable[[Sequence[str]], bytes],
    offline_ingestion: Callable[[Settings, VectorIndex], IngestionService],
) -> None:
    settings = Settings(_env_file=None, fs_storage_dir=tmp_path)
    index = InMemoryIndex()
    monkeypatch.setattr(task, "get_settings", lambda: settings)
    monkeypatch.setattr(task, "build_ingestion_service", lambda s: offline_ingestion(s, index))
    monkeypatch.setitem(celery_app.conf, "broker_url", "memory://")
    monkeypatch.setitem(celery_app.conf, "broker_transport_options", {"polling_interval": 0.01})
    pdf = make_pdf(["One.", "Two.", "Three."])
    FsStorage(tmp_path).put(KEY, io.BytesIO(pdf), content_type="application/pdf", size=len(pdf))

    # Leaving the block stops the worker, which takes about 4 s: its loop waits 2 s per cycle.
    with start_worker(celery_app, perform_ping_check=False, loglevel="WARNING"):
        task_id = CeleryQueue(celery_app).enqueue_ingestion(PDF_ID, KEY)
        deadline = time.monotonic() + 10
        while index.count(PDF_ID) < 3 and time.monotonic() < deadline:
            time.sleep(0.05)

    assert task_id
    assert index.count(PDF_ID) == 3
