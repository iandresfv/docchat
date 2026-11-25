import re
from collections.abc import Callable, Sequence
from pathlib import Path
from uuid import UUID

import pytest
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from typer.testing import CliRunner

from docchat import cli
from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.core.settings import Settings
from docchat.ports.vector_index import Chunk, VectorIndex
from docchat.services.ingestion_service import IngestionService

runner = CliRunner()

type OfflineIngestion = Callable[[Settings, VectorIndex], IngestionService]


@pytest.fixture
def cli_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Settings:
    settings = Settings(_env_file=None, fs_storage_dir=tmp_path / "storage")
    monkeypatch.setattr(cli, "get_settings", lambda: settings)
    return settings


def test_ingest_prints_the_page_and_chunk_counts(
    cli_settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    make_pdf: Callable[[Sequence[str]], bytes],
    offline_ingestion: OfflineIngestion,
) -> None:
    monkeypatch.setattr(
        cli, "build_ingestion_service", lambda s: offline_ingestion(s, InMemoryIndex())
    )
    pdf = tmp_path / "doc.pdf"
    pdf.write_bytes(make_pdf(["First.", "Second."]))

    result = runner.invoke(cli.app, ["ingest", str(pdf)])

    assert result.exit_code == 0, result.output
    assert "pages   2" in result.output
    assert "chunks  2" in result.output


def test_a_missing_key_is_one_line_not_a_traceback(
    cli_settings: Settings, tmp_path: Path, make_pdf: Callable[[Sequence[str]], bytes]
) -> None:
    pdf = tmp_path / "doc.pdf"
    pdf.write_bytes(make_pdf(["Text."]))

    result = runner.invoke(cli.app, ["ingest", str(pdf)])

    assert result.exit_code == 1
    assert "VOYAGE_API_KEY is not set" in result.output
    assert "Traceback" not in result.output


def test_ask_prints_the_answer_and_its_sources(
    cli_settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    embeddings = DeterministicFakeEmbedding(size=8)
    index = InMemoryIndex()
    pdf_id = UUID("00000000-0000-4000-8000-000000000001")
    text = "Chat generation is not queued."
    index.upsert([Chunk(f"{pdf_id}:0003:0000", pdf_id, 3, 0, text, embeddings.embed_query(text))])
    monkeypatch.setattr(cli, "build_embeddings", lambda _: embeddings)
    monkeypatch.setattr(cli, "build_vector_index", lambda _: index)
    monkeypatch.setattr(
        cli, "build_chat_model", lambda _: FakeListChatModel(responses=["It is not [p.3]."])
    )

    result = runner.invoke(cli.app, ["ask", str(pdf_id), "Is chat queued?"])

    assert result.exit_code == 0, result.output
    assert "It is not [p.3]." in result.output
    assert re.search(r"p\.3  \d\.\d\d  Chat generation is not queued\.\n", result.output)
