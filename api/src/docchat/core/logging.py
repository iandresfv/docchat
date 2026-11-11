import logging
import sys

import structlog
from structlog.typing import Processor

from docchat.core.settings import Settings


def configure_logging(settings: Settings) -> None:
    """Send structlog and standard-library records (uvicorn's included) through one renderer."""
    shared: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True, key="ts"),
    ]
    renderer: list[Processor] = (
        [structlog.processors.format_exc_info, structlog.processors.JSONRenderer()]
        if settings.log_format == "json"
        else [structlog.dev.ConsoleRenderer()]
    )

    structlog.configure(
        processors=[*shared, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            foreign_pre_chain=shared,
            processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, *renderer],
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
    # RequestIdMiddleware writes the access line, with the request id and the duration.
    logging.getLogger("uvicorn.access").disabled = True
    # httpx logs every outgoing request at INFO; SDKs built on it would flood the output.
    logging.getLogger("httpx").setLevel(logging.WARNING)
