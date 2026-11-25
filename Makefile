.DEFAULT_GOAL := help
.PHONY: help tools install run worker lint fmt type test test-external check openapi secrets-dev

API := uv run --directory api
# Every cluster command names its context: nothing here may reach a cluster other than minikube.
KUBECTL := kubectl --context minikube
DEV_NAMESPACE := docchat-dev

help: ## List every target
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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

worker: ## Run the ingestion worker locally; needs Redis at CELERY_BROKER_URL
	$(API) celery -A docchat.worker.celery_app worker -Q ingestion --concurrency 2

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

test-external: ## Test the API against the real services, with the keys in api/.env
	$(API) --env-file .env pytest -m external

check: lint type test ## Lint, type-check and test everything (the gate)
	pnpm --dir client check

openapi: ## Export api/docs/openapi.json, the contract the client's types come from
	$(API) python scripts/export_openapi.py

secrets-dev: ## Copy the API keys from api/.env into the dev cluster's Secret docchat-api-keys
	@test -f api/.env || { echo "missing api/.env: copy api/.env.example and fill in the keys"; exit 1; }
	@$(KUBECTL) create namespace $(DEV_NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f - >/dev/null
	@grep -E '^(ANTHROPIC|VOYAGE|PINECONE)_API_KEY=.' api/.env \
		| $(KUBECTL) -n $(DEV_NAMESPACE) create secret generic docchat-api-keys \
			--from-env-file=/dev/stdin --dry-run=client -o yaml \
		| $(KUBECTL) apply -f -
