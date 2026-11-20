import io
from collections.abc import Callable, Sequence

import pytest
from pypdf import PdfReader, PdfWriter

from docchat.adapters.pdf.pypdf_extractor import PypdfExtractor
from docchat.core.errors import PdfTooLarge, PdfUnreadable
from docchat.ports.pdf_extractor import PageText

type MakePdf = Callable[[Sequence[str]], bytes]

extractor = PypdfExtractor()


def test_extracts_every_page_in_order_numbered_from_one(make_pdf: MakePdf) -> None:
    pdf = make_pdf(["First page.", "Second page.", "Third page."])

    pages = extractor.extract(io.BytesIO(pdf), max_pages=10)

    assert pages == [
        PageText(1, "First page."),
        PageText(2, "Second page."),
        PageText(3, "Third page."),
    ]


def test_a_blank_page_keeps_its_place_with_empty_text(make_pdf: MakePdf) -> None:
    pdf = make_pdf(["Cover.", "", "Body."])

    pages = extractor.extract(io.BytesIO(pdf), max_pages=10)

    assert [page.text for page in pages] == ["Cover.", "", "Body."]


def test_rejects_more_pages_than_the_limit(make_pdf: MakePdf) -> None:
    pdf = make_pdf(["One.", "Two.", "Three."])

    with pytest.raises(PdfTooLarge, match="3 pages; the limit is 2"):
        extractor.extract(io.BytesIO(pdf), max_pages=2)


@pytest.mark.parametrize("data", [b"", b"not a pdf", b"%PDF-1.7\ntruncated"])
def test_rejects_a_file_that_is_not_a_pdf(data: bytes) -> None:
    with pytest.raises(PdfUnreadable, match="not a readable PDF"):
        extractor.extract(io.BytesIO(data), max_pages=10)


def test_rejects_a_pdf_without_text(make_pdf: MakePdf) -> None:
    with pytest.raises(PdfUnreadable, match="no text layer"):
        extractor.extract(io.BytesIO(make_pdf(["", ""])), max_pages=10)


def test_rejects_a_password_protected_pdf(make_pdf: MakePdf) -> None:
    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(make_pdf(["Secret."]))))
    writer.encrypt(user_password="secret", algorithm="RC4-128")
    encrypted = io.BytesIO()
    writer.write(encrypted)
    encrypted.seek(0)

    with pytest.raises(PdfUnreadable, match="password-protected"):
        extractor.extract(encrypted, max_pages=10)
