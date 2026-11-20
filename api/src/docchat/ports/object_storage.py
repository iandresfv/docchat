"""Object storage for uploaded PDFs. Keys look like `pdfs/{user_id}/{pdf_id}.pdf`."""

from contextlib import AbstractContextManager
from typing import BinaryIO, Protocol


class ObjectStorage(Protocol):
    # `presigned_url` joins when the PDF viewer needs it (S3); a port lists what its callers use.

    def put(self, key: str, data: BinaryIO, *, content_type: str, size: int) -> None: ...

    def open(self, key: str) -> AbstractContextManager[BinaryIO]:
        """Read an object: `with storage.open(key) as file: ...`. Raises `NotFound`."""
        ...

    def delete(self, key: str) -> None:
        """Delete an object; deleting one that does not exist is not an error."""
        ...

    def healthcheck(self) -> bool: ...
