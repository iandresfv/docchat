"""`docchat` on the command line: ingestion and questions without the HTTP API.

The CLI is a composition root, like `main.py` for the API: it reads the settings, builds the
adapters and hands them to a service. Anything worth testing lives in the service.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

import typer

from docchat.adapters.pdf.pypdf_extractor import PypdfExtractor
from docchat.adapters.storage.fs_storage import FsStorage
from docchat.adapters.vector.pinecone_index import PineconeIndex
from docchat.core.errors import AppError
from docchat.core.logging import configure_logging
from docchat.core.settings import MissingSetting, Settings, get_settings, require_secret
from docchat.ports.vector_index import VectorIndex
from docchat.rag.answer import answer_question
from docchat.rag.components.llms import build_chat_model
from docchat.rag.components.registry import build_embeddings
from docchat.services.ingestion_service import IngestionService

app = typer.Typer(help="DocChat from the terminal.", no_args_is_help=True, add_completion=False)


def build_vector_index(settings: Settings) -> VectorIndex:
    return PineconeIndex.connect(
        api_key=require_secret(settings.pinecone_api_key, "PINECONE_API_KEY"),
        index_name=settings.pinecone_index_name,
    )


@contextmanager
def errors_as_messages() -> Iterator[None]:
    """Expected failures print one line and exit 1; anything else keeps its traceback."""
    try:
        yield
    except (AppError, MissingSetting) as exc:
        typer.secho(f"error: {exc}", err=True, fg=typer.colors.RED)
        raise typer.Exit(1) from exc


@app.callback()
def main() -> None:
    configure_logging(get_settings())


@app.command()
def ingest(
    path: Annotated[
        Path, typer.Argument(exists=True, dir_okay=False, readable=True, help="The PDF file.")
    ],
    pdf_id: Annotated[
        UUID | None, typer.Option(help="Re-ingest under this id instead of a new one.")
    ] = None,
) -> None:
    """Store a PDF, then extract, chunk, embed and index it."""
    settings = get_settings()
    pdf_id = pdf_id or uuid4()
    with errors_as_messages():
        storage = FsStorage(settings.fs_storage_dir)
        key = f"pdfs/cli/{pdf_id}.pdf"
        with path.open("rb") as file:
            storage.put(key, file, content_type="application/pdf", size=path.stat().st_size)
        service = IngestionService(
            storage=storage,
            extractor=PypdfExtractor(),
            embeddings=build_embeddings(settings),
            index=build_vector_index(settings),
            settings=settings,
        )
        result = service.run(pdf_id, key)
    typer.echo(
        f"pdf_id  {result.pdf_id}\npages   {result.page_count}\nchunks  {result.chunk_count}"
    )


@app.command()
def ask(
    pdf_id: Annotated[UUID, typer.Argument(help="The id `docchat ingest` printed.")],
    question: Annotated[str, typer.Argument(help="The question, in quotes.")],
    k: Annotated[int, typer.Option(min=1, max=20, help="How many chunks to answer from.")] = 4,
) -> None:
    """Answer a question about an ingested PDF from its most similar chunks."""
    settings = get_settings()
    with errors_as_messages():
        answer = answer_question(
            question,
            pdf_id=pdf_id,
            embeddings=build_embeddings(settings),
            index=build_vector_index(settings),
            llm=build_chat_model(settings),
            k=k,
        )
    typer.echo(f"{answer.text}\n\nSources:")
    for source in answer.sources:
        preview = " ".join(source.chunk.text.split())
        preview = preview if len(preview) <= 72 else preview[:71] + "…"
        typer.echo(f"  p.{source.chunk.page}  {source.score:.2f}  {preview}")
