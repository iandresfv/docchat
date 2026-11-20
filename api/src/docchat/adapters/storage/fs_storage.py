"""`ObjectStorage` on a local directory: for tests and for working without a cluster."""

import os
import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import BinaryIO

from docchat.core.errors import NotFound


class FsStorage:
    def __init__(self, root: Path) -> None:
        self._root = root.resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def put(self, key: str, data: BinaryIO, *, content_type: str, size: int) -> None:
        # content_type and size matter to S3; a file on disk needs neither.
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        partial = path.with_name(path.name + ".part")
        with partial.open("wb") as out:
            shutil.copyfileobj(data, out)
        partial.replace(path)  # atomic: a reader never sees half a file

    @contextmanager
    def open(self, key: str) -> Iterator[BinaryIO]:
        path = self._path(key)
        if not path.is_file():
            raise NotFound(f"No stored object {key!r}.")
        with path.open("rb") as file:
            yield file

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def healthcheck(self) -> bool:
        return self._root.is_dir() and os.access(self._root, os.W_OK)

    def _path(self, key: str) -> Path:
        path = (self._root / key).resolve()
        # A key like "../../etc/passwd" must not reach outside the storage directory.
        if not path.is_relative_to(self._root) or path == self._root:
            raise ValueError(f"invalid storage key {key!r}")
        return path
