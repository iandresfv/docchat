import httpx

PREFLIGHT = {"Access-Control-Request-Method": "POST"}


async def test_preflight_allows_the_configured_origin(client: httpx.AsyncClient) -> None:
    response = await client.options(
        "/docs", headers={"Origin": "http://localhost:5173", **PREFLIGHT}
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "X-Request-ID" in response.headers


async def test_preflight_rejects_other_origins(client: httpx.AsyncClient) -> None:
    response = await client.options(
        "/docs", headers={"Origin": "https://evil.example", **PREFLIGHT}
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


async def test_browser_can_read_the_request_id(client: httpx.AsyncClient) -> None:
    response = await client.get("/docs", headers={"Origin": "http://localhost:5173"})

    assert "X-Request-ID" in response.headers["access-control-expose-headers"]
