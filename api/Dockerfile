# syntax=docker/dockerfile:1
# One image, several roles: the container's command picks the API (uvicorn) or the worker
# (celery). Build from api/: `docker build -t docchat-api api`.

ARG PYTHON_IMAGE=python:3.13-slim-trixie

FROM ghcr.io/astral-sh/uv:0.11.17 AS uv

# Builder: resolves the locked dependencies into /app/.venv. Nothing from here but the
# virtualenv reaches the final image.
FROM ${PYTHON_IMAGE} AS builder
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# Dependencies alone first: this layer is rebuilt only when the lockfile changes, not on every
# edit to the code.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --locked --no-dev --no-install-project
COPY pyproject.toml uv.lock ./
COPY src ./src
# --no-editable installs the project into the virtualenv, so the runtime needs no src/.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

# Dev: what Tilt builds. The project is installed editable, so Python imports straight from
# /app/src, where Tilt syncs every saved file; uvicorn --reload and watchfiles then restart.
FROM builder AS dev
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev \
    && chown -R 65532:65532 /app/src
ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/tmp
USER 65532:65532
EXPOSE 8000
CMD ["uvicorn", "docchat.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Runtime: the same Python, the virtualenv and an unprivileged user. No uv, no compilers. The
# last stage, so a plain `docker build` produces it.
FROM ${PYTHON_IMAGE} AS runtime
COPY --from=builder /app/.venv /app/.venv
# The user has no home directory: caches (Voyage's tokenizer) go to /tmp, the one writable path
# when the cluster mounts the root filesystem read-only.
ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/tmp
WORKDIR /app
USER 65532:65532
EXPOSE 8000
CMD ["uvicorn", "docchat.main:app", "--host", "0.0.0.0", "--port", "8000"]
