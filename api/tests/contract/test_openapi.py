import json
from pathlib import Path

from fastapi import FastAPI

SNAPSHOT = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"


def test_openapi_matches_the_committed_contract(app: FastAPI) -> None:
    committed = json.loads(SNAPSHOT.read_text())

    assert app.openapi() == committed, "The API contract changed: run `make openapi` and commit it."
