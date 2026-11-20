"""`PdfExtractor` on pypdf (BSD-3). See ADR-0013."""

from typing import BinaryIO, Literal

from pypdf import PdfReader
from pypdf.errors import DependencyError, PyPdfError

from docchat.core.errors import PdfTooLarge, PdfUnreadable
from docchat.ports.pdf_extractor import PageText


class PypdfExtractor:
    def __init__(self, *, extraction_mode: Literal["plain", "layout"] = "plain") -> None:
        # "layout" keeps columns and tables aligned with spaces; "plain" reads better as prose.
        self._extraction_mode: Literal["plain", "layout"] = extraction_mode

    def extract(self, file: BinaryIO, *, max_pages: int) -> list[PageText]:
        try:
            reader = PdfReader(file)
            # Many PDFs are encrypted with an empty password only to restrict printing or
            # copying; those open with "". Anything else needs a password we do not have.
            if reader.is_encrypted and not reader.decrypt(""):
                raise PdfUnreadable("The PDF is password-protected.")
            page_count = len(reader.pages)
            if page_count > max_pages:
                raise PdfTooLarge(f"The PDF has {page_count} pages; the limit is {max_pages}.")
            pages = [
                PageText(number, page.extract_text(extraction_mode=self._extraction_mode).strip())
                for number, page in enumerate(reader.pages, start=1)
            ]
        except (PyPdfError, DependencyError) as exc:
            # DependencyError: AES encryption needs the `cryptography` package, not installed.
            raise PdfUnreadable("The file is not a readable PDF.") from exc

        if not any(page.text for page in pages):
            raise PdfUnreadable("The PDF has no text layer; scanned documents are not supported.")
        return pages
