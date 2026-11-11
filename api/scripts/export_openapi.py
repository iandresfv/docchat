"""Writes docs/openapi.json, the contract the client generates its TypeScript types from."""

import json
from pathlib import Path

from docchat.core.settings import Settings
from docchat.main import create_app

TARGET = Path(__file__).resolve().parents[1] / "docs" / "openapi.json"

if __name__ == "__main__":
    document = create_app(Settings(_env_file=None)).openapi()
    TARGET.write_text(json.dumps(document, indent=2) + "\n")
    print(f"wrote {TARGET}")
