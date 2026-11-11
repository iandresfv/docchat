.DEFAULT_GOAL := help
.PHONY: help tools install run lint fmt type test check openapi

API := uv run --directory api

help: ## List every target
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

tools: ## Verify the required tools are installed
	@for tool in uv pnpm; do \
		command -v $$tool >/dev/null || { echo "missing: $$tool"; exit 1; }; \
	done
	@echo "ok: uv, pnpm"

install: ## Install dependencies for both applications
	uv sync --directory api
	pnpm --dir client install

run: ## Run the API locally with reload
	$(API) uvicorn docchat.main:app --reload

lint: ## Lint and check formatting of the API
	$(API) ruff check .
	$(API) ruff format --check .

fmt: ## Apply lint fixes and formatting to the API
	$(API) ruff check --fix .
	$(API) ruff format .

type: ## Type-check the API
	$(API) mypy

test: ## Test the API
	$(API) pytest

check: lint type test ## Lint, type-check and test everything (the gate)
	pnpm --dir client check

openapi: ## Export api/docs/openapi.json, the contract the client's types come from
	$(API) python scripts/export_openapi.py
