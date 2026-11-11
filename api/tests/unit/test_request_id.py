import json
import uuid

import httpx
import pytest
from structlog.contextvars import merge_contextvars
from structlog.testing import capture_logs

from docchat.core.settings import Settings
from docchat.main import create_app


async def test_generates_a_request_id_when_none_is_sent(client: httpx.AsyncClient) -> None:
    response = await client.get("/docs")

    assert uuid.UUID(response.headers["X-Request-ID"])


async def test_reuses_a_valid_incoming_request_id(client: httpx.AsyncClient) -> None:
    response = await client.get("/docs", headers={"X-Request-ID": "proxy-42"})

    assert response.headers["X-Request-ID"] == "proxy-42"


@pytest.mark.parametrize("incoming", ["has spaces", "x" * 129, "line\tbreak"])
async def test_replaces_an_unsafe_incoming_request_id(
    client: httpx.AsyncClient, incoming: str
) -> None:
    response = await client.get("/docs", headers={"X-Request-ID": incoming})

    assert uuid.UUID(response.headers["X-Request-ID"])


async def test_writes_one_access_line_per_request(client: httpx.AsyncClient) -> None:
    with capture_logs(processors=[merge_contextvars]) as logs:
        response = await client.get("/missing")

    [line] = [entry for entry in logs if entry["event"] == "request"]
    assert line["request_id"] == response.headers["X-Request-ID"]
    assert line["method"] == "GET"
    assert line["path"] == "/missing"
    assert line["status"] == 404
    assert line["duration_ms"] >= 0


async def test_json_format_writes_one_object_per_line(capsys: pytest.CaptureFixture[str]) -> None:
    app = create_app(Settings(_env_file=None, log_format="json"))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/docs")

    line = json.loads(capsys.readouterr().out.splitlines()[-1])
    assert line["event"] == "request"
    assert line["level"] == "info"
    assert line["request_id"] == response.headers["X-Request-ID"]
    assert "ts" in line
