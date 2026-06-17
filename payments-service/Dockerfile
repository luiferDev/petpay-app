# Build stage
FROM rust:1.94.0-slim-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  pkg-config \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy dependency files first (for better caching)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && echo "pub mod lib {}" > src/lib.rs

# Build dependencies
RUN cargo build --release
RUN rm -rf src

# Copy source code
COPY . .

# Build application
RUN cargo build --release --bin payments-service

# Production stage
FROM debian:bookworm-slim AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
  ca-certificates \
  libssl3 \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy binary from builder
COPY --from=builder /app/target/release/payments-service /usr/local/bin/payments-service

# Copy configuration
WORKDIR /app
COPY --chown=appuser:appuser .env.example ./

# Use non-root user
USER appuser

# Expose port
EXPOSE 8083

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8083/health || exit 1

# Run the application
CMD ["payments-service"]
