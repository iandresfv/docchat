from collections.abc import Callable, Sequence
from pathlib import Path

import pytest
from langchain_core.embeddings import DeterministicFakeEmbedding
from typer.testing import CliRunner

from docchat import cli
from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.core.settings import Settings

runner = CliRunner()


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
) -> None:
    monkeypatch.setattr(cli, "build_embeddings", lambda _: DeterministicFakeEmbedding(size=8))
    monkeypatch.setattr(cli, "build_vector_index", lambda _: InMemoryIndex())
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
