# Every command a person runs. `make gate` is the definition of done.

GO_COVER   := coverage/backend
PLAYWRIGHT := cd e2e && npx playwright
IMAGE      := calculator

.PHONY: help install dev build build-web build-go run fmt fmt-check vet lint typecheck \
        test test-go test-web coverage e2e gate evidence docker docker-e2e

help: ## List the targets
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## Install npm dependencies and the Playwright browser
	cd frontend && npm ci
	cd e2e && npm ci
	$(PLAYWRIGHT) install $(if $(CI),--with-deps,) chromium

dev: ## Run the service on :8080 and the Vite dev server, which proxies /api to it
	@trap 'kill 0' INT TERM EXIT; \
	(cd backend && go run ./cmd/calculator) & \
	(cd frontend && npm run dev) & \
	wait

build: build-web build-go ## Build the app into frontend/dist and the service into bin/calculator

run: build ## Build, then run the service on :8080; STATIC_DIR=frontend/dist also serves the app
	./bin/calculator

build-web:
	cd frontend && npm run build

build-go:
	cd backend && CGO_ENABLED=0 go build -trimpath -o ../bin/calculator ./cmd/calculator

fmt: ## Format Go, TypeScript and CSS
	gofmt -w backend
	cd frontend && npm run format
	cd e2e && npm run format

fmt-check: ## Fail if anything needs formatting
	@out=$$(gofmt -l backend); if [ -n "$$out" ]; then echo "gofmt needed:"; echo "$$out"; exit 1; fi
	cd frontend && npm run format:check
	cd e2e && npm run format:check

vet: ## go vet
	cd backend && go vet ./...

lint: ## ESLint
	cd frontend && npm run lint

typecheck: ## tsc for the app and the e2e suite
	cd frontend && npm run typecheck
	cd e2e && npm run typecheck

test: test-go test-web ## Both unit suites with their coverage thresholds

test-go:
	@mkdir -p $(GO_COVER)
	cd backend && go test -covermode=set -coverprofile=../$(GO_COVER)/coverage.out ./...
	cd backend && go tool cover -html=../$(GO_COVER)/coverage.out -o ../$(GO_COVER)/coverage.html
	node scripts/coverage.mjs check-go

test-web:
	cd frontend && npm run coverage

coverage: test ## Run both unit suites and regenerate coverage/SUMMARY.md
	node scripts/coverage.mjs summary

e2e: ## Playwright against the real binary serving the built app
	$(PLAYWRIGHT) test

gate: fmt-check vet lint typecheck coverage e2e ## Everything CI runs

evidence: ## Record the e2e tests tagged @issue-$(ISSUE) into docs/evidence/$(ISSUE)/; DOCKER=1 records against the image (not part of the gate)
	@if [ -z "$(ISSUE)" ]; then echo "make evidence: ISSUE is required, e.g. make evidence ISSUE=4" >&2; exit 2; fi
	@$(PLAYWRIGHT) test --list --grep "@issue-$(ISSUE)\b" | grep -q '^Total: [1-9]' || \
		{ echo "make evidence: no e2e test is tagged @issue-$(ISSUE)" >&2; exit 2; }
	rm -rf "docs/evidence/$(ISSUE)"
ifdef DOCKER
	$(MAKE) docker
	EVIDENCE_DIR="$(CURDIR)/docs/evidence/$(ISSUE)" scripts/docker-e2e.sh $(IMAGE) --grep "@issue-$(ISSUE)\b"
else
	cd e2e && EVIDENCE_DIR="$(CURDIR)/docs/evidence/$(ISSUE)" npx playwright test --grep "@issue-$(ISSUE)\b"
endif

docker: ## Build the image and print its size and how to run it
	docker build -t $(IMAGE) .
	@docker image ls $(IMAGE):latest --format 'Image size: {{.Size}}'
	@echo "Run it with: docker run --rm -p 8080:8080 $(IMAGE)   then open http://localhost:8080"

docker-e2e: docker ## Run the e2e suite against the image (not part of the gate)
	scripts/docker-e2e.sh $(IMAGE)
