"""The task body and its retry policy, run eagerly with `apply()`: no broker, no worker."""

import io
from collections.abc import Callable, Sequence
from pathlib import Path
from uuid import UUID

import pytest
from structlog.testing import capture_logs

from docchat.adapters.storage.fs_storage import FsStorage
from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.core.errors import UpstreamUnavailable
from docchat.core.settings import Settings
from docchat.ports.vector_index import VectorIndex
from docchat.services.ingestion_service import IngestionService
from docchat.worker.tasks import ingest_pdf as task

PDF_ID = UUID("00000000-0000-4000-8000-000000000001")
KEY = f"pdfs/cli/{PDF_ID}.pdf"

type OfflineIngestion = Callable[[Settings, VectorIndex], IngestionService]


class FlakyIndex(InMemoryIndex):
    """Unavailable for the first `failures` runs of the ingestion, then fine."""

    def __init__(self, failures: int) -> None:
        super().__init__()
        self.failures = failures
        self.runs = 0

    def delete_pdf(self, pdf_id: UUID) -> None:
        self.runs += 1
        if self.runs <= self.failures:
            raise UpstreamUnavailable("Pinecone is busy.")
        super().delete_pdf(pdf_id)


@pytest.fixture
def worker_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Settings:
    settings = Settings(_env_file=None, fs_storage_dir=tmp_path)
    monkeypatch.setattr(task, "get_settings", lambda: settings)
    return settings


def store(settings: Settings, pdf: bytes) -> None:
    FsStorage(settings.fs_storage_dir).put(
        KEY, io.BytesIO(pdf), content_type="application/pdf", size=len(pdf)
    )


def use_index(
    monkeypatch: pytest.MonkeyPatch, offline_ingestion: OfflineIngestion, index: VectorIndex
) -> None:
    monkeypatch.setattr(task, "build_ingestion_service", lambda s: offline_ingestion(s, index))


def test_indexes_the_stored_pdf_and_logs_it_ready(
    worker_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    make_pdf: Callable[[Sequence[str]], bytes],
    offline_ingestion: OfflineIngestion,
) -> None:
    index = InMemoryIndex()
    use_index(monkeypatch, offline_ingestion, index)
    store(worker_settings, make_pdf(["One.", "Two."]))

    with capture_logs() as logs:
        result = task.ingest_pdf.apply(args=(str(PDF_ID), KEY))

    assert result.successful()
    assert index.count(PDF_ID) == 2
    statuses = [log for log in logs if log["event"] == "pdf.status"]
    assert [log["status"] for log in statuses] == ["processing", "ready"]
    assert statuses[-1]["chunks"] == 2


def test_retries_a_transient_failure_until_it_passes(
    worker_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    make_pdf: Callable[[Sequence[str]], bytes],
    offline_ingestion: OfflineIngestion,
) -> None:
    index = FlakyIndex(failures=2)
    use_index(monkeypatch, offline_ingestion, index)
    store(worker_settings, make_pdf(["One."]))

    result = task.ingest_pdf.apply(args=(str(PDF_ID), KEY))

    assert result.successful()
    assert index.runs == 3
    assert index.count(PDF_ID) == 1


def test_gives_up_after_three_retries_and_logs_it_failed(
    worker_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    make_pdf: Callable[[Sequence[str]], bytes],
    offline_ingestion: OfflineIngestion,
) -> None:
    index = FlakyIndex(failures=99)
    use_index(monkeypatch, offline_ingestion, index)
    store(worker_settings, make_pdf(["One."]))

    with capture_logs() as logs:
        result = task.ingest_pdf.apply(args=(str(PDF_ID), KEY))

    assert result.failed()
    assert index.runs == 1 + task.MAX_RETRIES
    assert [log["status"] for log in logs if log["event"] == "pdf.status"][-1] == "failed"
    assert sum(log["event"] == "ingestion.retry" for log in logs) == task.MAX_RETRIES


def test_a_pdf_without_text_fails_at_once(
    worker_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    make_pdf: Callable[[Sequence[str]], bytes],
    offline_ingestion: OfflineIngestion,
) -> None:
    index = FlakyIndex(failures=0)
    use_index(monkeypatch, offline_ingestion, index)
    store(worker_settings, make_pdf(["", ""]))  # two blank pages, like a scan

    with capture_logs() as logs:
        result = task.ingest_pdf.apply(args=(str(PDF_ID), KEY))

    assert result.failed()
    assert index.runs == 0  # it failed while extracting, before touching the index
    failed = [log for log in logs if log.get("status") == "failed"]
    assert failed[0]["error"].startswith("PdfUnreadable: ")
