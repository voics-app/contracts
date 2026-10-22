.PHONY: dev test lint build docker validate codegen check-generated

dev: ## regenerate every artifact from the sources
	pnpm codegen

validate:
	pnpm validate

codegen:
	pnpm codegen

test:
	pnpm test
	cargo test --workspace
	cd packages/elixir && mix test

lint:
	pnpm lint
	pnpm typecheck
	cargo clippy --workspace --all-targets -- -D warnings
	cd packages/elixir && mix format --check-formatted && mix credo --strict

build:
	pnpm build

docker:
	@echo "contracts is a library repository: it publishes packages, not an image."

check-generated: codegen
	git diff --exit-code -- . ':!pnpm-lock.yaml' ':!Cargo.lock'
	test -z "$$(git ls-files --others --exclude-standard)"

# Install the pre-push hook (lint + unit tests, see lefthook.yml).
.PHONY: hooks
hooks:
	lefthook install
