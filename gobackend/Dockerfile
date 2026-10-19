# Build stage
FROM golang:1.27-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binary with no CGO dependencies.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/api ./cmd/api

# Final stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Non-root user for runtime security.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /bin/api /app/api
COPY --from=builder /app/migrations /app/migrations

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/monitoring/ready || exit 1

ENTRYPOINT ["/app/api"]
