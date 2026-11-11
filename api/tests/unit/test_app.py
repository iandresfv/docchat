import httpx


async def test_openapi_document_is_served(client: httpx.AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "DocChat API"


async def test_swagger_ui_is_served(client: httpx.AsyncClient) -> None:
    response = await client.get("/docs")

    assert response.status_code == 200
