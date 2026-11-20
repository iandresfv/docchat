"""Page-aware chunking. See ADR-0013.

Each page is split on its own, so every chunk keeps the page it came from and an answer can cite
it. The cost is a short last chunk on most pages.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

from langchain_text_splitters import RecursiveCharacterTextSplitter

from docchat.ports.pdf_extractor import PageText

# Paragraphs first, then lines, sentences and words: a split lands on the largest boundary that
# keeps the chunk under the size.
SEPARATORS = ["\n\n", "\n", ". ", " "]


@dataclass(frozen=True, slots=True)
class TextChunk:
    """A piece of one page's text, before it is embedded."""

    id: str
    page: int
    ordinal: int
    text: str


def chunk_id(pdf_id: UUID, page: int, ordinal: int) -> str:
    """Stable id: re-ingesting the same PDF overwrites its chunks instead of duplicating them."""
    return f"{pdf_id}:{page:04d}:{ordinal:04d}"


def chunk_pages(
    pdf_id: UUID, pages: Sequence[PageText], *, size: int, overlap: int
) -> list[TextChunk]:
    """Split every page into chunks of at most `size` characters, `overlap` shared between
    neighbours. `ordinal` counts from 0 on each page."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=size,
        chunk_overlap=overlap,
        separators=SEPARATORS,
        keep_separator="end",
    )
    return [
        TextChunk(chunk_id(pdf_id, page.page, ordinal), page.page, ordinal, text)
        for page in pages
        for ordinal, text in enumerate(splitter.split_text(page.text))
    ]
