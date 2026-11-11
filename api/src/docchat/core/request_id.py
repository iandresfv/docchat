import re
import time
import uuid

import structlog
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
# An id set by a proxy is reused only if it is short and printable, so it cannot forge log lines.
_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9._:-]{1,128}")

access_log = structlog.get_logger("docchat.access")


def get_request_id() -> str | None:
    """The id of the request being handled, or None outside a request."""
    value = structlog.contextvars.get_contextvars().get("request_id")
    return value if isinstance(value, str) else None


class RequestIdMiddleware:
    """Tags each request with an id, echoes it in `X-Request-ID` and writes one access line.

    The id is bound to structlog's context, so every log line written while the request is
    handled carries it. Written as plain ASGI, which avoids the extra task and in-memory
    channel that `BaseHTTPMiddleware` adds to every request.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get(REQUEST_ID_HEADER, "")
        request_id = incoming if _VALID_REQUEST_ID.fullmatch(incoming) else str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        status = 500
        started = time.perf_counter()

        async def send_with_request_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            access_log.info(
                "request",
                method=scope["method"],
                path=scope["path"],
                status=status,
                duration_ms=round((time.perf_counter() - started) * 1000, 1),
            )
