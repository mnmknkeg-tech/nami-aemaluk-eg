.PHONY: build build-api build-worker test race lint fmt vet clean run-api run-worker migrate-up migrate-down docker-up docker-down

GO := go
BIN_DIR := ./bin
API_BIN := $(BIN_DIR)/api
WORKER_BIN := $(BIN_DIR)/worker

build: build-api build-worker

build-api:
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 $(GO) build -ldflags="-s -w" -o $(API_BIN) ./cmd/api

build-worker:
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 $(GO) build -ldflags="-s -w" -o $(WORKER_BIN) ./cmd/worker

test:
	$(GO) test -v ./...

race:
	$(GO) test -race ./...

fmt:
	$(GO) fmt ./...

vet:
	$(GO) vet ./...

clean:
	rm -rf $(BIN_DIR)

run-api:
	$(GO) run ./cmd/api

run-worker:
	$(GO) run ./cmd/worker

migrate-up:
	$(GO) run ./scripts/migrate.go up

migrate-down:
	$(GO) run ./scripts/migrate.go down

docker-up:
	docker-compose -f docker-compose.yml up --build -d

docker-down:
	docker-compose -f docker-compose.yml down
