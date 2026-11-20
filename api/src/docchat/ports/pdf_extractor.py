"""PDF text extraction: the page-numbered text of a PDF file."""

from dataclasses import dataclass
from typing import BinaryIO, Protocol


@dataclass(frozen=True, slots=True)
class PageText:
    """The text of one page. `page` is 1-based, the number a PDF viewer shows."""

    page: int
    text: str


class PdfExtractor(Protocol):
    def extract(self, file: BinaryIO, *, max_pages: int) -> list[PageText]:
        """Return the text of every page, in order; a page without text has an empty string.

        Raises `PdfTooLarge` above `max_pages` pages, and `PdfUnreadable` when the file is not
        a PDF, is password-protected, or has no text on any page.
        """
        ...
