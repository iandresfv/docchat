from collections.abc import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI

from docchat.core.settings import Settings
from docchat.main import create_app


@pytest.fixture
def settings() -> Settings:
    # Defaults only: a developer's local .env must not change test results.
    return Settings(_env_file=None)


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
