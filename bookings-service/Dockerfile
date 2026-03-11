# Stage 1: Builder
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY ./ .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o bookings-service ./cmd/main.go

# Stage 2: Runner
FROM alpine:latest AS runner

# Install certificates
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bookings-service .
COPY config.yaml .

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8082/health || exit 1

# Run binary
CMD ["./bookings-service"]
