from importlib.metadata import version

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from docchat.core.body_limit import BodySizeLimitMiddleware
from docchat.core.logging import configure_logging
from docchat.core.request_id import REQUEST_ID_HEADER, RequestIdMiddleware
from docchat.core.settings import Settings, get_settings

# Room for the multipart framing (boundaries and part headers) around an uploaded file.
MULTIPART_HEADROOM_BYTES = 1024 * 1024


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else get_settings()
    configure_logging(settings)

    app = FastAPI(title="DocChat API", version=version("docchat"))

    # The last middleware added runs first: request id → CORS → body limit → routes.
    app.add_middleware(
        BodySizeLimitMiddleware,
        max_bytes=settings.max_upload_bytes + MULTIPART_HEADROOM_BYTES,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER, "Retry-After"],
    )
    app.add_middleware(RequestIdMiddleware)
    return app


app = create_app()
