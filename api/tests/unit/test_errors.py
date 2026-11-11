import httpx
import pytest
from fastapi import FastAPI
from pydantic import BaseModel

from docchat.core.errors import (
    AppError,
    BudgetExceeded,
    Conflict,
    Forbidden,
    NotFound,
    PayloadTooLarge,
    PdfNotReady,
    RateLimited,
    Unauthorized,
    UnsupportedMediaType,
    UpstreamUnavailable,
)
from docchat.core.settings import Settings
from docchat.main import create_app

ERRORS: dict[str, AppError] = {
    "unauthorized": Unauthorized(),
    "forbidden": Forbidden(),
    "not-found": NotFound("pdf 42 does not exist"),
    "conflict": Conflict(),
    "pdf-not-ready": PdfNotReady(),
    "payload-too-large": PayloadTooLarge(),
    "unsupported-media-type": UnsupportedMediaType(),
    "rate-limited": RateLimited(retry_after=30),
    "budget-exceeded": BudgetExceeded(),
    "upstream-unavailable": UpstreamUnavailable(),
}


class Signup(BaseModel):
    email: str
    password: str


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    app = create_app(settings)

    @app.post("/signup")
    async def signup(body: Signup) -> Signup:
        return body

    @app.get("/raise/{slug}")
    async def raise_app_error(slug: str) -> None:
        raise ERRORS[slug]

    @app.get("/crash")
    async def crash() -> None:
        raise RuntimeError("database password is hunter2")

    return app


async def test_unknown_route_is_a_not_found_problem(client: httpx.AsyncClient) -> None:
    response = await client.get("/missing")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json() == {
        "type": "https://github.com/iandresfv/docchat/errors/not-found",
        "title": "Not Found",
        "status": 404,
        "instance": "/missing",
        "requestId": response.headers["X-Request-ID"],
    }


async def test_wrong_method_gets_a_slug_from_its_status(client: httpx.AsyncClient) -> None:
    response = await client.delete("/health")

    assert response.status_code == 405
    assert response.json()["type"].endswith("/method-not-allowed")


async def test_invalid_body_lists_each_field_error(client: httpx.AsyncClient) -> None:
    response = await client.post("/signup", json={"email": "a@example.com"})

    assert response.status_code == 422
    problem = response.json()
    assert problem["type"].endswith("/validation-error")
    assert problem["errors"] == [{"loc": ["body", "password"], "msg": "Field required"}]


@pytest.mark.parametrize("slug", ERRORS)
async def test_app_errors_map_to_their_status_and_slug(
    client: httpx.AsyncClient, slug: str
) -> None:
    response = await client.get(f"/raise/{slug}")

    problem = response.json()
    assert response.status_code == ERRORS[slug].status == problem["status"]
    assert problem["type"].endswith(f"/{slug}")
    assert problem["requestId"] == response.headers["X-Request-ID"]


async def test_app_error_detail_and_headers_reach_the_client(client: httpx.AsyncClient) -> None:
    not_found = await client.get("/raise/not-found")
    rate_limited = await client.get("/raise/rate-limited")

    assert not_found.json()["detail"] == "pdf 42 does not exist"
    assert rate_limited.headers["Retry-After"] == "30"


async def test_unexpected_error_is_an_internal_problem_without_details(app: FastAPI) -> None:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/crash")

    problem = response.json()
    assert response.status_code == 500
    assert problem["type"].endswith("/internal")
    assert problem["requestId"] == response.headers["X-Request-ID"]
    assert "hunter2" not in response.text
