import itertools
from uuid import UUID

from docchat.ports.pdf_extractor import PageText
from docchat.rag.chunking import TextChunk, chunk_id, chunk_pages

PDF_ID = UUID("00000000-0000-4000-8000-000000000001")


def sentences(count: int, page: int) -> str:
    return " ".join(f"Page {page} sentence {n} says something." for n in range(count))


def test_chunk_id_is_pdf_page_and_ordinal_zero_padded() -> None:
    assert chunk_id(PDF_ID, 3, 12) == f"{PDF_ID}:0003:0012"


def test_a_short_page_is_one_chunk() -> None:
    chunks = chunk_pages(PDF_ID, [PageText(1, "Hello.")], size=100, overlap=20)

    assert chunks == [TextChunk(f"{PDF_ID}:0001:0000", 1, 0, "Hello.")]


def test_a_long_page_splits_into_bounded_overlapping_chunks() -> None:
    page = PageText(1, sentences(40, page=1))

    chunks = chunk_pages(PDF_ID, [page], size=200, overlap=60)

    assert len(chunks) > 1
    assert all(len(chunk.text) <= 200 for chunk in chunks)
    assert [chunk.ordinal for chunk in chunks] == list(range(len(chunks)))
    for previous, current in itertools.pairwise(chunks):
        # The overlap repeats the tail of one chunk at the head of the next.
        assert current.text.split(". ")[0] in previous.text


def test_no_chunk_crosses_a_page_and_ordinals_restart_per_page() -> None:
    pages = [PageText(1, sentences(20, page=1)), PageText(2, sentences(20, page=2))]

    chunks = chunk_pages(PDF_ID, pages, size=200, overlap=40)

    for chunk in chunks:
        assert f"Page {chunk.page} " in chunk.text
        assert f"Page {3 - chunk.page} " not in chunk.text
    first_on_page_two = next(chunk for chunk in chunks if chunk.page == 2)
    assert first_on_page_two.ordinal == 0
    assert first_on_page_two.id == f"{PDF_ID}:0002:0000"


def test_an_empty_page_produces_no_chunks() -> None:
    chunks = chunk_pages(PDF_ID, [PageText(1, ""), PageText(2, "Text.")], size=100, overlap=10)

    assert [chunk.page for chunk in chunks] == [2]
