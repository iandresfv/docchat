"""`docchat` on the command line: ingestion and questions without the HTTP API.

The CLI is a composition root, like `main.py` for the API: it reads the settings, has
`docchat.wiring` build the adapters and hands them to a service. Anything worth testing lives in
the service.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

import typer

from docchat.core.errors import AppError
from docchat.core.logging import configure_logging
from docchat.core.settings import MissingSetting, get_settings
from docchat.rag.answer import answer_question
from docchat.rag.components.llms import build_chat_model
from docchat.rag.components.registry import build_embeddings
from docchat.wiring import (
    build_ingestion_service,
    build_storage,
    build_task_queue,
    build_vector_index,
)

app = typer.Typer(help="DocChat from the terminal.", no_args_is_help=True, add_completion=False)


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
    inline: Annotated[
        bool, typer.Option(help="Index it here and wait, without the queue and the worker.")
    ] = False,
) -> None:
    """Store a PDF and queue it for the worker to extract, chunk, embed and index."""
    settings = get_settings()
    pdf_id = pdf_id or uuid4()
    key = f"pdfs/cli/{pdf_id}.pdf"
    with errors_as_messages():
        with path.open("rb") as file:
            build_storage(settings).put(
                key, file, content_type="application/pdf", size=path.stat().st_size
            )
        if inline:
            result = build_ingestion_service(settings).run(pdf_id, key)
            typer.echo(
                f"pdf_id  {pdf_id}\npages   {result.page_count}\nchunks  {result.chunk_count}"
            )
            return
        task_id = build_task_queue(settings).enqueue_ingestion(pdf_id, key)
    typer.echo(f"pdf_id  {pdf_id}\ntask    {task_id}\nqueued: the worker log shows the progress")


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
