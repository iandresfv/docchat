import io
from pathlib import Path

import pytest

from docchat.adapters.storage.fs_storage import FsStorage
from docchat.core.errors import NotFound


@pytest.fixture
def storage(tmp_path: Path) -> FsStorage:
    return FsStorage(tmp_path / "storage")


def test_put_then_open_returns_the_same_bytes(storage: FsStorage) -> None:
    storage.put(
        "pdfs/u1/p1.pdf", io.BytesIO(b"%PDF-1.7 ..."), content_type="application/pdf", size=12
    )

    with storage.open("pdfs/u1/p1.pdf") as file:
        assert file.read() == b"%PDF-1.7 ..."


def test_open_a_missing_key_is_not_found(storage: FsStorage) -> None:
    with pytest.raises(NotFound), storage.open("pdfs/u1/missing.pdf"):
        pass


def test_delete_is_idempotent(storage: FsStorage) -> None:
    storage.put("a.pdf", io.BytesIO(b"x"), content_type="application/pdf", size=1)

    storage.delete("a.pdf")
    storage.delete("a.pdf")

    with pytest.raises(NotFound), storage.open("a.pdf"):
        pass


@pytest.mark.parametrize("key", ["../outside.pdf", "pdfs/../../outside.pdf", "/etc/passwd", ""])
def test_rejects_keys_outside_the_storage_directory(storage: FsStorage, key: str) -> None:
    with pytest.raises(ValueError, match="invalid storage key"):
        storage.put(key, io.BytesIO(b"x"), content_type="application/pdf", size=1)


def test_healthcheck_reports_a_writable_directory(storage: FsStorage) -> None:
    assert storage.healthcheck() is True
