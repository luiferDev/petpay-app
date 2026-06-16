# Petpay Integration Tests

End-to-end integration tests for the petpay-app monorepo. Spins up all microservices in Docker, waits for health checks, and runs each service's test suite against the live stack.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   test-runner container                  │
│  (Go 1.25, Node 22, Bun 1.x, Rust 1.94)                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Identity  │  │Marketpl. │  │ Catalog  │  │ Bookings│ │
│  │ bun test  │  │go test   │  │go test   │  │go test  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │             │              │        │
│  ┌────▼──────────────▼─────────────▼──────────────▼────┐ │
│  │               Cross-service tests                    │ │
│  │          (bun test, HTTP calls between services)     │ │
│  └───────────────────────┬─────────────────────────────┘ │
└──────────────────────────┼───────────────────────────────┘
                           │
                           │ Docker network (petpay-test-network)
                           │
    ┌──────┐ ┌──────┐ ┌────┴───┐ ┌──────┐ ┌──────┐ ┌──────┐
    │Postg.│ │ Redis│ │RabbitMQ│ │Kraken│ │Identity│ │Market│
    │ :5432│ │:6379 │ │ :5672  │ │:8080 │ │ :3000  │ │:8080 │
    └──────┘ └──────┘ └────────┘ └──────┘ └────────┘ └──────┘
```

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker | 24+ | With `docker compose` plugin |
| bash | 4+ | For running `run.sh` |

The test-runner container bundles all language runtimes automatically.

## Quick Start

```bash
# Full test suite
./tests/integration/run.sh
```

## Test Suites

| Service | Command | Language | Description |
|---------|---------|----------|-------------|
| Identity | `bun test --coverage` | TypeScript | Auth, user CRUD, OAuth flows |
| Marketplace | `go test ./tests/integration/...` | Go | Order lifecycle, payments integration |
| Catalog | `go test ./tests/integration/...` | Go | Products, categories, offers |
| Bookings | `go test ./tests/integration/...` | Go | Booking CRUD, status transitions |
| Payments | `cargo test --test '*integration*'` | Rust | Payment processing, invoices, coupons |
| Cross-service | `bun test` | TypeScript | Multi-service workflows (e.g. order→payment) |

## Running Individual Suites

```bash
# Start services
docker compose -f tests/integration/docker-compose.test.yml -p petpay-test up -d --build --wait

# Run a single test suite
docker compose -f tests/integration/docker-compose.test.yml -p petpay-test \
  exec -T test-runner /bin/bash -c "cd /app/Identity && bun test --coverage"

# Run a specific Go test
docker compose -f tests/integration/docker-compose.test.yml -p petpay-test \
  exec -T test-runner /bin/bash -c "cd /app/marketplace && go test -v -run TestCreateOrder ./..."

# Run a specific Rust test
docker compose -f tests/integration/docker-compose.test.yml -p petpay-test \
  exec -T test-runner /bin/bash -c "cd /app/payments-service && cargo test payment_entity_test"

# Tear down
docker compose -f tests/integration/docker-compose.test.yml -p petpay-test down -v
```

## Creating Integration Tests

### Go (Marketplace / Catalog / Bookings)

Create test files in `tests/integration/` within each service:

```go
// marketplace/tests/integration/order_flow_test.go
package integration

import (
    "net/http"
    "testing"
)

func TestCreateAndGetOrder(t *testing.T) {
    // Services are available via Docker DNS:
    // identity:3000, marketplace:8080, postgres:5432, etc.
    resp, err := http.Get("http://marketplace:8080/health")
    if err != nil {
        t.Fatalf("marketplace unreachable: %v", err)
    }
    defer resp.Body.Close()
}
```

### Rust (Payments)

Create test files in `payments-service/tests/` with `*integration*` in the name:

```rust
// payments-service/tests/integration_payment_test.rs
use reqwest;

#[tokio::test]
async fn test_payment_flow() {
    let client = reqwest::Client::new();
    let resp = client.get("http://payments:8083/health")
        .send()
        .await
        .expect("payments unreachable");
    assert!(resp.status().is_success());
}
```

### TypeScript (Identity / Cross-service)

Create test files anywhere in the Identity service or in `tests/integration/cross-service/`:

```typescript
// Identity/src/tests/integration/auth-flow.test.ts
import { describe, it, expect } from "bun:test";

describe("Auth Flow", () => {
  it("should register and login", async () => {
    const res = await fetch("http://identity:3000/health");
    expect(res.ok).toBe(true);
  });
});
```

## Environment

The test compose file sets `NODE_ENV=test` / `GIN_MODE=test` and short-lived JWT secrets. All databases are created on startup via `postgres/init.sql`.

### Ports

| Service | Internal | Host |
|---------|----------|------|
| Identity | 3000 | 3000 |
| Marketplace | 8080 | 8080 |
| Catalog | 8081 | 8081 |
| Bookings | 8082 | 8082 |
| Payments | 8083 | 8083 |
| KrakenD | 8080 | 8000 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6379 |
| RabbitMQ | 5672 | 5672 |
| RabbitMQ UI | 15672 | 15672 |

## CI Integration

### GitHub Actions

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run integration tests
        run: ./tests/integration/run.sh

      - name: Upload test logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-logs
          path: /tmp/petpay-test-logs/
```

### GitLab CI

```yaml
integration:
  stage: test
  script:
    - ./tests/integration/run.sh
  artifacts:
    when: always
    paths:
      - /tmp/petpay-test-logs/
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Port conflicts on startup | Main stack is running | `docker compose down` |
| `bun: command not found` | Test-runner build failed | Rebuild: `docker compose -f ... build test-runner` |
| `go test ./tests/integration/...` finds no tests | Test directory doesn't exist yet | Create `tests/integration/` in the service |
| Slow first run | Docker images need building | Run `docker compose -f ... build --parallel` |
| Test-runner exits immediately | Insufficient memory | Increase Docker resources |
| Database connection refused | Postgres not ready | Check `docker compose logs postgres` |
