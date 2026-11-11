import asyncio
from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Request, Response

from docchat import __version__
from docchat.api.schemas.health import HealthResponse, ReadinessResponse

ReadinessCheck = Callable[[], Awaitable[bool]]
CHECK_TIMEOUT_SECONDS = 2.0

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> HealthResponse:
    """Liveness: the process answers. Calls no dependency, so a slow database never restarts it."""
    return HealthResponse(status="ok", version=__version__)


@router.get("/ready", responses={503: {"model": ReadinessResponse}})
async def ready(request: Request, response: Response) -> ReadinessResponse:
    """Readiness: every dependency answers, so the pod may receive traffic."""
    checks: dict[str, ReadinessCheck] = request.app.state.readiness_checks
    results = await asyncio.gather(*(_passes(check) for check in checks.values()))
    if not all(results):
        response.status_code = 503
    return ReadinessResponse(
        status="ready" if all(results) else "not_ready",
        checks={name: "ok" if ok else "fail" for name, ok in zip(checks, results, strict=True)},
        version=__version__,
    )


async def _passes(check: ReadinessCheck) -> bool:
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_SECONDS):
            return await check()
    except Exception:
        return False
