import asyncio

import httpx
import pytest
from fastapi import FastAPI

from docchat import __version__
from docchat.api.routes import health


async def test_health_answers_without_calling_dependencies(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": __version__}


async def test_ready_with_no_dependencies_yet(client: httpx.AsyncClient) -> None:
    response = await client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "checks": {}, "version": __version__}


async def test_ready_is_503_when_a_check_fails_raises_or_hangs(
    app: FastAPI, client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(health, "CHECK_TIMEOUT_SECONDS", 0.05)

    async def passes() -> bool:
        return True

    async def fails() -> bool:
        return False

    async def raises() -> bool:
        raise ConnectionError("redis is down")

    async def hangs() -> bool:
        await asyncio.sleep(60)
        return True

    app.state.readiness_checks = {"a": passes, "b": fails, "c": raises, "d": hangs}
    response = await client.get("/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert response.json()["checks"] == {"a": "ok", "b": "fail", "c": "fail", "d": "fail"}
