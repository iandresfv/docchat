from collections.abc import AsyncIterator, Callable, Sequence

import httpx
import pytest
from fastapi import FastAPI
from langchain_core.embeddings import DeterministicFakeEmbedding

from docchat.adapters.pdf.pypdf_extractor import PypdfExtractor
from docchat.adapters.storage.fs_storage import FsStorage
from docchat.core.settings import Settings
from docchat.main import create_app
from docchat.ports.vector_index import VectorIndex
from docchat.services.ingestion_service import IngestionService


@pytest.fixture
def settings() -> Settings:
    # Defaults only: a developer's local .env must not change test results.
    return Settings(_env_file=None)


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def make_pdf() -> Callable[[Sequence[str]], bytes]:
    return build_pdf


@pytest.fixture
def offline_ingestion() -> Callable[[Settings, VectorIndex], IngestionService]:
    """The real ingestion over `FS_STORAGE_DIR`, with fake embeddings and the given index."""

    def build(settings: Settings, index: VectorIndex) -> IngestionService:
        return IngestionService(
            storage=FsStorage(settings.fs_storage_dir),
            extractor=PypdfExtractor(),
            embeddings=DeterministicFakeEmbedding(size=8),
            index=index,
            settings=settings,
        )

    return build


def build_pdf(pages: Sequence[str]) -> bytes:
    """A minimal valid PDF with one line of Helvetica per page; an empty string is a blank page.

    Written by hand so the tests need no PDF-writing dependency and show exactly what is inside.
    """
    count = len(pages)
    kids = " ".join(f"{4 + 2 * i} 0 R" for i in range(count))
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{kids}] /Count {count} >>".encode(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    for i, text in enumerate(pages):
        escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content = f"BT /F1 12 Tf 72 720 Td ({escaped}) Tj ET".encode() if text else b""
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {5 + 2 * i} 0 R >>".encode()
        )
        objects.append(b"<< /Length %d >>\nstream\n%s\nendstream" % (len(content), content))

    pdf = bytearray(b"%PDF-1.7\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    xref_at = len(pdf)
    pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    pdf += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    pdf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        xref_at,
    )
    return bytes(pdf)
