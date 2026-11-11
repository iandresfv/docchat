"""Errors as RFC 9457 problem details (`application/problem+json`), the API's only error shape."""

from collections.abc import Mapping
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response

from docchat.core.request_id import REQUEST_ID_HEADER, get_request_id

ERROR_TYPE_BASE = "https://github.com/iandresfv/docchat/errors/"

# Slugs for statuses that reach the API as HTTPException (routing, request parsing).
_SLUGS = {
    401: "unauthorized",
    403: "forbidden",
    404: "not-found",
    409: "conflict",
    413: "payload-too-large",
    415: "unsupported-media-type",
    422: "validation-error",
    429: "rate-limited",
    503: "upstream-unavailable",
}


class AppError(Exception):
    """An error a service raises on purpose. The handler maps it to problem+json."""

    status = 500
    slug = "internal"

    def __init__(self, detail: str | None = None, headers: dict[str, str] | None = None) -> None:
        super().__init__(detail or HTTPStatus(self.status).phrase)
        self.detail = detail
        self.headers = headers


class Unauthorized(AppError):
    status, slug = 401, "unauthorized"


class Forbidden(AppError):
    status, slug = 403, "forbidden"


class NotFound(AppError):
    status, slug = 404, "not-found"


class Conflict(AppError):
    status, slug = 409, "conflict"


class PdfNotReady(AppError):
    status, slug = 409, "pdf-not-ready"


class PayloadTooLarge(AppError):
    status, slug = 413, "payload-too-large"


class UnsupportedMediaType(AppError):
    status, slug = 415, "unsupported-media-type"


class RateLimited(AppError):
    status, slug = 429, "rate-limited"

    def __init__(self, detail: str | None = None, *, retry_after: int) -> None:
        super().__init__(detail, headers={"Retry-After": str(retry_after)})


class BudgetExceeded(AppError):
    status, slug = 429, "budget-exceeded"


class UpstreamUnavailable(AppError):
    status, slug = 503, "upstream-unavailable"


def problem_response(
    status: int,
    slug: str,
    detail: str | None = None,
    *,
    instance: str | None = None,
    errors: list[dict[str, Any]] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": ERROR_TYPE_BASE + slug,
        "title": HTTPStatus(status).phrase,
        "status": status,
    }
    if detail:
        body["detail"] = detail
    if instance:
        body["instance"] = instance
    if request_id := get_request_id():
        body["requestId"] = request_id
    if errors is not None:
        body["errors"] = errors
    return JSONResponse(
        body, status_code=status, headers=headers, media_type="application/problem+json"
    )


async def handle_error(request: Request, exc: Exception) -> Response:
    path = request.url.path
    match exc:
        case AppError():
            return problem_response(
                exc.status, exc.slug, exc.detail, instance=path, headers=exc.headers
            )
        case RequestValidationError():
            errors = [{"loc": list(error["loc"]), "msg": error["msg"]} for error in exc.errors()]
            return problem_response(
                422, "validation-error", "The request is invalid.", instance=path, errors=errors
            )
        case HTTPException():
            phrase = HTTPStatus(exc.status_code).phrase
            slug = _SLUGS.get(exc.status_code) or phrase.lower().replace(" ", "-")
            detail = exc.detail if exc.detail != phrase else None
            return problem_response(
                exc.status_code, slug, detail, instance=path, headers=exc.headers
            )
        case _:
            # Reached outside RequestIdMiddleware, so the header is set here. No detail: the
            # message of an unexpected exception may expose internals.
            headers = {REQUEST_ID_HEADER: request_id} if (request_id := get_request_id()) else None
            return problem_response(500, "internal", instance=path, headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    for exc_class in (AppError, RequestValidationError, HTTPException, Exception):
        app.add_exception_handler(exc_class, handle_error)
