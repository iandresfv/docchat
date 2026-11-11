from collections.abc import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI, Request

from docchat.core.settings import Settings
from docchat.main import MULTIPART_HEADROOM_BYTES, create_app

LIMIT = 1 + MULTIPART_HEADROOM_BYTES


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None, max_upload_bytes=1)


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    app = create_app(settings)

    @app.post("/echo")
    async def echo(request: Request) -> dict[str, int]:
        return {"size": len(await request.body())}

    return app


async def test_accepts_a_body_within_the_limit(client: httpx.AsyncClient) -> None:
    response = await client.post("/echo", content=b"x" * LIMIT)

    assert response.status_code == 200
    assert response.json() == {"size": LIMIT}


async def test_rejects_a_declared_length_over_the_limit(client: httpx.AsyncClient) -> None:
    response = await client.post("/echo", content=b"x" * (LIMIT + 1))

    assert response.status_code == 413
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["type"].endswith("/payload-too-large")


async def test_stops_reading_a_chunked_body_over_the_limit(client: httpx.AsyncClient) -> None:
    async def chunks() -> AsyncIterator[bytes]:
        for _ in range(3):
            yield b"x" * MULTIPART_HEADROOM_BYTES

    response = await client.post("/echo", content=chunks())

    assert "content-length" not in response.request.headers
    assert response.status_code == 413
    assert response.json()["type"].endswith("/payload-too-large")
