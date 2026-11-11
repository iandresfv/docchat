from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from docchat.core.errors import problem_response

TOO_LARGE = "Request body too large"


class BodySizeLimitMiddleware:
    """Answers 413 to request bodies over `max_bytes`, without reading them whole.

    A declared `Content-Length` is checked before the body is read. A body sent without one
    (chunked) is counted as it arrives, and reading stops at the first byte over the limit.
    """

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = Headers(scope=scope).get("content-length", "")
        if declared.isdigit() and int(declared) > self.max_bytes:
            response = problem_response(413, "payload-too-large", TOO_LARGE, instance=scope["path"])
            await response(scope, receive, send)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise HTTPException(status_code=413, detail=TOO_LARGE)
            return message

        await self.app(scope, limited_receive, send)
