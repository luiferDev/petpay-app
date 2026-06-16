# PetPay Refactor Plan

> Monorepo: Identity (TS/Bun/Express), Marketplace (Go/Gin/GORM), Catalog (Go/Gin/GORM), Bookings (Go/Gin/GORM/RabbitMQ), Payments (Rust/Axum/SeaORM)
> Last updated: 2026-06-16
> Status: All critical bugs fixed, CI/CD operational, k8s manifests complete, integration tests written

---

## Status Dashboard

| Service | Language | Source Lines | Unit Tests | Integration Tests | CI | K8s Manifest | Payments | RMQ |
|---------|----------|-------------|------------|-------------------|----|--------------|----------|-----|
| Identity | TS/Bun | ~15,784 | 40 files (~5,281 lines) | 2 files (625 lines) | ✅ Lint + Test | ✅ | N/A | ✅ Pub + Con + DLQ |
| Marketplace | Go | ~1,040 | 1 file (178 lines) | 1 file (362 lines) | ✅ Go fmt+vet | ✅ | N/A | ❌ (needs consumer) |
| Catalog | Go | ~940 | 1 file (185 lines) | 1 file (435 lines) | ✅ Go fmt+vet | ✅ | N/A | ❌ (needs consumer) |
| Bookings | Go | ~908 | 5 files (~739 lines) | 1 file (624 lines) | ✅ Go fmt+vet | ✅ | N/A | ✅ Pub + DLQ |
| Payments | Rust | ~4,030 | 4 files (564 lines) | 2 files (1,772 lines) | ✅ Cargo clippy | ✅ | ⚠️ Stubs | ✅ Con |

**Totals**: ~22,650 source lines, ~10,462 test lines across 44 test files, 13 integration test files

Legend: ✅ Done  ⚠️ Partial/Stubs  ❌ Missing  N/A Not applicable

### Key Metrics

| Metric | Count |
|--------|-------|
| Total test files | 44 |
| Total test lines | 10,462 |
| Integration test files | 13 |
| Integration test lines | ~5,100+ |
| Bugs fixed (critical) | 8 |
| Architecture improvements | 10+ |
| Kubernetes manifests created/fixed | 2 (payments, bookings) |
| GitHub Actions workflows | 2 (linting.yml, ci.yml) |

---

## Critical Infrastructure (Fixed)

### ✅ Integration Tests Created (13 files, ~5,100+ lines)

#### Test Framework & Infrastructure

| File | Lines | Description |
|------|-------|-------------|
| `tests/integration/docker-compose.test.yml` | ~200 | Standalone Docker Compose with all services + test-runner |
| `tests/integration/Dockerfile.test-runner` | ~40 | Multi-runtime image (Go 1.25, Node 22, Bun, Rust 1.94) |
| `tests/integration/run.sh` | ~80 | Orchestrator script: up -> test -> report -> down |
| `tests/integration/README.md` | 210 | Documentation with architecture diagram, CI instructions |
| `tests/integration/run-cross-service.sh` | ~40 | Cross-service test runner |
| `tests/integration/cross-service/cross-service.test.ts` | 522 | End-to-end flows across Identity -> Marketplace -> Payments |

#### Identity (TypeScript/Bun) — 3,260 test lines across 24 files

| File | Lines | Description |
|------|-------|-------------|
| `Identity/src/tests/integration/api.integration.test.ts` | 380 | Full auth HTTP API tests (register, login, refresh, logout) |
| `Identity/src/infrastructure/messaging/__tests__/RabbitMQEventPublisher.test.ts` | 245 | RMQ publishing tests with describeIfRmq pattern |
| `Identity/src/tests/load/registration-load.test.ts` | 385 | Load test for concurrent registration |
| `Identity/src/application/use-case/auth/__tests__/RegisterUserUseCase.test.ts` | 288 | User registration use case tests |
| `Identity/src/application/use-case/auth/__tests__/LoginUseCase.test.ts` | 195 | Login use case tests |
| `Identity/src/application/use-case/auth/__tests__/LogoutUseCase.test.ts` | 73 | Logout use case tests |
| `Identity/src/application/use-case/auth/__tests__/RefreshTokenUseCase.test.ts` | 101 | Refresh token use case tests |
| `Identity/src/application/use-case/auth/__tests__/RegisterUserUseCase.concurrency.test.ts` | 134 | Concurrency tests for registration |
| `Identity/src/application/use-case/oauth/__tests__/OAuthLoginUseCase.test.ts` | 231 | OAuth login use case tests |
| `Identity/src/application/strategies/registration/__tests__/UserRegisterStrategy.test.ts` | 64 | User registration strategy tests |
| `Identity/src/application/strategies/registration/__tests__/ServiceProviderRegistrationStrategy.test.ts` | 68 | SP registration strategy tests |
| `Identity/src/application/strategies/registration/__tests__/AdminRegistrationStrategy.test.ts` | 64 | Admin registration strategy tests |
| `Identity/src/domain/entities/__tests__/User.test.ts` | 115 | User entity tests |
| `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.test.ts` | 166 | Auth controller tests |
| `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` | 413 | Concurrency auth controller tests |
| `Identity/src/infrastructure/http/controllers/__tests__/auth-flow.integration.test.ts` | 307 | Auth flow integration tests |
| `Identity/src/infrastructure/http/controllers/__tests__/OAuthController.test.ts` | 253 | OAuth controller tests |
| `Identity/src/infrastructure/http/middlewares/__tests__/auth.middleware.test.ts` | 88 | Auth middleware tests |
| `Identity/src/infrastructure/http/middlewares/__tests__/error.handler.test.ts` | 156 | Error handler tests |
| `Identity/src/infrastructure/http/middlewares/__tests__/validation.middleware.test.ts` | 182 | Validation middleware tests |
| `Identity/src/infrastructure/services/__tests__/JwtTokenProvider.test.ts` | 173 | JWT provider tests |
| `Identity/src/infrastructure/services/__tests__/JwtTokenProvider.refresh.test.ts` | 126 | JWT refresh tests |
| `Identity/src/infrastructure/services/__tests__/NodemailerService.test.ts` | 155 | Email service tests |
| `Identity/src/infrastructure/services/__tests__/OAuthStateManager.test.ts` | 135 | OAuth state manager tests |
| `Identity/src/infrastructure/services/__tests__/RedisService.test.ts` | 110 | Redis service tests |
| `Identity/src/shared/utils/__tests__/concurrency.test.ts` | 194 | Concurrency utility tests |

#### Marketplace (Go) — 540 test lines across 2 files

| File | Lines | Description |
|------|-------|-------------|
| `marketplace/tests/integration/api_test.go` | 362 | 9 HTTP integration tests (order CRUD, health, error cases) |
| `marketplace/internal/application/services/order_service_test.go` | 178 | Order service unit tests |

#### Catalog (Go) — 620 test lines across 2 files

| File | Lines | Description |
|------|-------|-------------|
| `catalog-&-offers/tests/integration/api_test.go` | 435 | 11 HTTP integration tests (product CRUD, categories, filters) |
| `catalog-&-offers/internal/application/adapters/product_adapter_test.go` | 185 | Product adapter unit tests |

#### Bookings (Go) — 1,363 test lines across 6 files

| File | Lines | Description |
|------|-------|-------------|
| `bookings-service/tests/integration/api_test.go` | 624 | 12 HTTP integration tests (booking CRUD, status transitions, error cases) |
| `bookings-service/internal/application/booking_service_test.go` | 394 | Booking service unit tests |
| `bookings-service/internal/infrastructure/http/handlers_test.go` | 330 | HTTP handler tests |
| `bookings-service/internal/domain/booking_test.go` | 115 | Booking domain entity tests |
| `bookings-service/internal/domain/booking_status_test.go` | 108 | Booking status transition tests |
| `bookings-service/internal/domain/service_type_test.go` | 92 | Service type enum tests |

#### Payments (Rust) — 2,336 test lines across 6 files

| File | Lines | Description |
|------|-------|-------------|
| `payments-service/tests/repository_integration_test.rs` | 1,038 | Testcontainers-based DB integration tests |
| `payments-service/tests/api_integration_test.rs` | 734 | HTTP API integration tests |
| `payments-service/tests/payment_entity_test.rs` | 123 | Payment entity unit tests |
| `payments-service/tests/invoice_entity_test.rs` | 131 | Invoice entity unit tests |
| `payments-service/tests/coupon_entity_test.rs` | 135 | Coupon entity unit tests |
| `payments-service/tests/payment_provider_test.rs` | 155 | Payment provider stub tests |

---

### ✅ CI/CD Pipeline (2 workflows)

#### `.github/workflows/ci.yml` — Full CI pipeline (219 lines)

| Job | Description |
|-----|-------------|
| `lint` | Lint all services: `ts-standard` (Identity), `go fmt+vet` (Marketplace, Catalog, Bookings), `cargo clippy` (Payments) |
| `unit-tests` | Matrix across 5 services, parallel execution with Postgres + Redis service containers |
| `integration-tests` | Runs `tests/integration/run.sh` on main branch only, after unit tests pass |
| `docker-build` | Matrix build check for all 5 Dockerfiles |

Key features:
- Caching for Go modules, Bun packages, Rust crates
- Service containers for Postgres + Redis
- Matrix strategy for parallel test execution
- Environment-specific test variables

#### `.github/workflows/linting.yml` — Legacy lint workflow (28 lines)
- Only runs on Identity changes
- Kept for backward compatibility; superseded by ci.yml

---

### ✅ Kubernetes (Previously Missing/Fixed)

#### Fixed: Missing manifests for Payments and Bookings

| File | Lines | Description |
|------|-------|-------------|
| `k8s/base/payments.yaml` | 105 | Deployment + Service (port 8083, 2 replicas, liveness/readiness probes, anti-affinity) |
| `k8s/base/bookings.yaml` | 99 | Deployment + Service (port 8082, 2 replicas, liveness/readiness probes, anti-affinity) |

#### Fixed: Ingress routing for /api/v1/payments

- **Before**: `/api/v1/payments` routed to `marketplace:8080` (wrong service)
- **After**: Routes to `payments:8083` with both wildcard and petpay.local host rules

`k8s/base/ingress.yaml` — 172 lines covering all 5 services with:
- CORS configuration (allow origins, methods, headers)
- Rate limiting (100k/s, 10 connections, 10 RPS)
- Security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection: 1)
- Proxy settings (body size 10m, timeouts 30/60s)

#### Fixed: Valid Kustomize structure

| File | Description |
|------|-------------|
| `k8s/base/kustomization.yaml` | Base config with 11 resources, 2 replicas per service, image tags |
| `k8s/overlays/dev/kustomization.yaml` | Dev overlay: 1 replica, debug logging, dev image tags |
| `k8s/overlays/prod/kustomization.yaml` | Prod overlay: 3 replicas, 1Gi limits, v1.0.0 tags, production env vars |

#### Fixed: Secrets without plain-text values

`k8s/base/secrets.yaml` — Declarative Secret resource (Opaque type) with:
- WARNING comments about not storing values in file
- Instructions for `kubectl create secret` or `create-secrets.sh` script
- 3 methods: interactive, auto-placeholders, from-env file
- `k8s/scripts/create-secrets.sh` companion script

#### Existing infrastructure

| File | Description |
|------|-------------|
| `k8s/base/namespace.yaml` | petpay namespace |
| `k8s/base/configmaps.yaml` | ConfigMaps for all 5 services (ports, env, URLs) |
| `k8s/base/postgres.yaml` | PostgreSQL statefulset |
| `k8s/base/redis.yaml` | Redis deployment |
| `k8s/krakend/configmap.yaml` | KrakenD API Gateway config |
| `k8s/krakend/deployment.yaml` | KrakenD deployment |
| `k8s/krakend/service.yaml` | KrakenD service |
| `k8s/ingress-nginx-nodeport.yaml` | NodePort for ingress-nginx |
| `k8s/config.yml` | General config |
| `k8s/README.md` | Documentation |

---

### ✅ RabbitMQ Event System

#### Exchange: `petpay.domain.events` (topic, durable)

**Routing keys used:**

| Routing Key | Publisher | Consumer | Status |
|-------------|-----------|----------|--------|
| `booking.created` | Bookings | Payments | ✅ |
| `booking.confirmed` | Bookings | Payments | ✅ |
| `booking.completed` | Bookings | None | ⚠️ No consumer |
| `booking.cancelled` | Bookings | Payments | ✅ |
| `booking.rescheduled` | Bookings | None | ⚠️ No consumer |
| `user.created` | Identity (wired) | None | ⚠️ No consumer |
| `service.provider.registered` | Identity (wired) | None | ⚠️ No consumer |

#### Identity — RabbitMQEventPublisher (TS)

`Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts` — 144 lines
- DLQ exchange `petpay.domain.events.dlx` (fanout)
- Exponential backoff reconnection (1s -> 30s max)
- Channel safety (null checks before publish)
- `@injectable()` via tsyringe DI
- Graceful close with `shouldReconnect` flag

#### Identity — RabbitMQEventConsumer (TS)

`Identity/src/infrastructure/messaging/RabbitMQEventConsumer.ts` — 74 lines
- Listens on `booking.#` and `payment.#` routing keys
- Queue: `identity-event-queue`
- Auto-reconnect on connection loss (5s delay)
- Proper ack/nack handling
- Currently only logs events (no business logic)

#### Bookings — RabbitMQ Publisher (Go)

`bookings-service/internal/infrastructure/messaging/rabbitmq_publisher.go` — 234 lines
- DLQ exchange `petpay.domain.events.dlx` (fanout)
- Background reconnection loop with exponential backoff (100ms -> 30s)
- Thread-safe connection access via `sync.RWMutex`
- 6 publish methods: Created, Confirmed, Completed, Cancelled, Rescheduled, generic publish

#### Payments — Event Consumer (Rust)

`payments-service/src/infrastructure/messaging/mod.rs` — 145 lines
- Uses `lapin` crate for AMQP with `futures_util::StreamExt`
- Queue: `payments-event-queue`
- Subscribes to: `booking.created`, `booking.confirmed`, `booking.cancelled`
- Handler stubs: `handle_event()` matches on routing key, currently only logs
- Spawned as tokio task with graceful stop via `Arc<Mutex<bool>>`

#### Shared Event Contracts

`Identity/src/domain/events/SharedEventTypes.ts` — 19 lines
```
BookingEvent: eventType, bookingId, customerId, serviceType, status, timestamp
UserEvent: eventType, userId, email, fullName, role, timestamp
DomainEvent = BookingEvent | UserEvent
```

---

### ✅ Payments Service Improvements (9 fixes)

#### Critical fixes

| Issue | File | Fix |
|-------|------|-----|
| N+1 query in invoice_repository.rs | `repositories/invoice_repository.rs` | Replaced `.all()` + in-memory `.filter()` with proper `ColumnTrait` queries |
| N+1 query in coupon_repository.rs | `repositories/coupon_repository.rs` | Same pattern fix |
| Migration no-op (never executed) | `database/mod.rs` + 3 migration files | Added `Migrator` struct with `MigratorTrait`, calls `Migrator::up()` at startup |

#### High priority fixes

| Issue | File | Fix |
|-------|------|-----|
| `unwrap()` crash in invoice.rs:65 | `handlers/invoice.rs` | Replaced with `map_err` returning HTTP 500 |
| 8 `eprintln!` calls in main.rs | `main.rs` | Replaced with `tracing::info!` / `tracing::error!` |
| Dead infrastructure auth middleware | `middleware/mod.rs` | **Deleted** entire module and its declaration |

#### Medium priority fixes

| Issue | Files | Fix |
|-------|-------|-----|
| Unused imports across 20+ files | All query/command files | Removed unused imports |
| Decimal->f64 conversion | 2 DTO response files | Used `.to_f64().unwrap_or(0.0)` from `rust_decimal::prelude::ToPrimitive` |
| Hardcoded `"customer_placeholder"` | Payment/invoice/coupon handlers | Replaced with `Claims` extractor (real JWT) |
| Unused `create_router()` | `infrastructure/http/mod.rs` | Removed dead code |
| Migration compile errors | All 3 migration files | Fixed `async_trait` import, `SchemaManager` lifetimes, `decimal()` signature |

---

## Remaining Work

### 🔴 Critical (Production-blocking)

#### 1. Implement real payment providers
- **What**: Stripe and PayPal are stubs returning placeholder responses
- **Why**: Payments service cannot process real transactions
- **Priority**: P0 — blocks any production deployment
- **Effort**: 2-3 weeks
- **Details**:
  - Stripe: Add `stripe` crate, implement `create_charge()`, `create_refund()`, webhook endpoint with signature verification
  - PayPal: Add OAuth2 token exchange (client_credentials flow), implement order create/capture/refund
  - Both: Add webhook endpoint with HMAC signature verification per provider spec
  - Testing: Wire mock payment provider in tests
  - Config: Move placeholder API keys to real secrets in k8s

#### 2. Implement actual event consumers (not stubs)
- **Payments consumer** (`payments-service/src/infrastructure/messaging/mod.rs`): `handle_event()` is a match statement with no real logic — needs to create payment records on `booking.created`, cancel on `booking.cancelled`
- **Identity consumer** (`RabbitMQEventConsumer.ts`): Only logs events — should handle `payment.completed` to update user state
- **Priority**: P0 — events are published but have zero effect
- **Effort**: 1 week

---

### 🟡 High Priority

#### 3. Add consumers for remaining Marketplace/Catalog events
- **What**: Marketplace should subscribe to `booking.created` to update order status; Catalog should subscribe to service events
- **Why**: Missing cross-service reactivity
- **Priority**: P1
- **Effort**: 2-3 days per service
- **Details**: Both Go services need a RabbitMQ consumer similar to Bookings' publisher but in reverse. Add `amqp091-go` dependency, consumer goroutine, map routing keys to internal handlers.

#### 4. Zero-downtime deployment configuration
- **What**: Add PodDisruptionBudgets, RollingUpdate strategy to k8s manifests
- **Why**: Current `recreate` default strategy causes downtime during updates
- **Priority**: P1
- **Effort**: 1 day
- **Files**: `k8s/base/*.yaml` — add `strategy.rollingUpdate.maxSurge` and `maxUnavailable` to deployments

#### 5. TLS/HTTPS with cert-manager
- **What**: Add cert-manager integration + Let's Encrypt ClusterIssuer for ingress
- **Why**: All traffic is currently plain HTTP
- **Priority**: P1
- **Effort**: 1-2 days
- **Files**: `k8s/overlays/prod/kustomization.yaml`, new `k8s/base/certificate.yaml`

#### 6. NetworkPolicies
- **What**: Add default-deny ingress policy per namespace, then allow specific service-to-service traffic
- **Why**: No network isolation between pods — any pod can reach any other pod
- **Priority**: P1
- **Effort**: 1 day
- **Files**: `k8s/base/network-policy.yaml`

#### 7. Fix Marketplace/Catalog DB names in k8s manifests
- **What**: Both `k8s/base/marketplace.yaml` and `k8s/base/catalog.yaml` hardcode `DB_NAME=petpay` (line 52 in each) — should be `petpay_marketplace` and `petpay_catalog`
- **Why**: Inconsistency with docker-compose.yml (already fixed to separate DBs)
- **Priority**: P1
- **Effort**: 5 minutes
- **Files**: `k8s/base/marketplace.yaml:52`, `k8s/base/catalog.yaml:52`

#### 8. Add readiness probe for RabbitMQ dependency
- **What**: Bookings depends on RabbitMQ but k8s manifest has no init container or startup probe to wait for RMQ
- **Why**: Bookings starts before RMQ is ready, causing reconnect spam in logs
- **Priority**: P1
- **Effort**: 0.5 day
- **Files**: `k8s/base/bookings.yaml`

---

### 🟢 Medium Priority

#### 9. HorizontalPodAutoscaler
- **What**: Create HPA manifests for each service based on CPU/memory
- **Why**: Current replica counts are static (2 in base, 3 in prod)
- **Priority**: P2
- **Effort**: 1 day
- **Files**: `k8s/base/hpa-*.yaml`

#### 10. Database connection pooling
- **What**: Tune pool sizes per service based on expected concurrency
- **Why**: Default pool sizes may cause connection storms or underutilization
- **Priority**: P2
- **Effort**: 0.5 day for tuning, 1 day for load testing

#### 11. Add more cross-service events
- **What**: Payments should emit `payment.*` events (completed, failed, refunded) so Identity/Marketplace can react
- **Why**: Currently only Bookings publishes events; no feedback loop from Payments
- **Priority**: P2
- **Effort**: 1 week
- **Details**: Add RabbitMQ publisher to Payments service (using `lapin`), define payment event types, wire into command handlers

#### 12. ServiceAccount per service
- **What**: Create dedicated ServiceAccount + RBAC Role + RoleBinding for each service instead of default SA
- **Why**: Least-privilege principle; default SA has namespace-level access
- **Priority**: P2
- **Effort**: 1 day

#### 13. Redis persistence
- **What**: Switch Redis from `emptyDir` to PVC with AOF persistence
- **Why**: Current k8s redis config implies ephemeral storage — data lost on pod restart
- **Priority**: P2
- **Effort**: 0.5 day

#### 14. DTO layers for Go services (audit existing)
- **What**: Verify DTO patterns were properly applied in Marketplace, Catalog, Bookings
- **Why**: Earlier session created DTO files but they may not be consistently wired
- **Priority**: P2
- **Effort**: 1 day for audit + fixes

#### 15. Graceful shutdown for Identity (Express)
- **What**: Add SIGTERM/SIGINT handler to close HTTP server, DB pool, RabbitMQ connections
- **Why**: Identity currently drops connections on pod termination
- **Priority**: P2
- **Effort**: 1 day
- **Files**: `Identity/src/infrastructure/http/server.ts`

#### 16. Add context.Context to Identity repositories
- **What**: Propagate `ctx` through all Drizzle database calls instead of using pool defaults
- **Why**: Request-scoped cancellation and timeout missing
- **Priority**: P2
- **Effort**: 1-2 days

---

### 🔵 Nice to Have

#### 17. Helm charts
- **What**: Package the Kustomize configs as Helm charts for parameterized releases
- **Why**: Easier versioning, release management, and CI integration
- **Priority**: P3
- **Effort**: 2-3 days

#### 18. Distributed tracing (OpenTelemetry)
- **What**: Add OTel SDK/tracing to all services with context propagation across HTTP + RMQ
- **Why**: No visibility into cross-service request flows for debugging
- **Priority**: P3
- **Effort**: 1 week per service (5 services = 5 weeks parallelizable)

#### 19. Contract testing (Pact or similar)
- **What**: Add contract tests between Identity -> Payments (email API), Marketplace -> Payments (order validation)
- **Why**: No regression protection for cross-service API changes
- **Priority**: P3
- **Effort**: 1 week initial setup, ongoing maintenance

#### 20. Grafana dashboards
- **What**: Dashboards for RabbitMQ queues, Postgres query performance, service metrics (CPU/memory/request rate)
- **Why**: No observability into production behavior
- **Priority**: P3
- **Effort**: 1 week

#### 21. API rate limiting per service
- **What**: Move beyond ingress-nginx rate limits to application-level rate limiting (per-user, per-endpoint)
- **Why**: No protection against abusive clients beyond nginx
- **Priority**: P3
- **Effort**: 1 week

#### 22. Database migration CI checks
- **What**: Run migration dry-run in CI to catch breaking schema changes before deployment
- **Why**: No migration validation in current CI pipeline
- **Priority**: P3
- **Effort**: 2 days

#### 23. Rename `catalog-&-offers` directory
- **What**: Rename to `catalog` to avoid shell escape issues with `&`
- **Why**: Directory name containing `&` causes issues in shell scripts, CI, and tooling
- **Priority**: P3
- **Effort**: 0.5 day (update imports, Dockerfiles, CI paths)
- **Risk**: HIGH — will break all Go import paths and CI references

#### 24. Dependency update audit
- **What**: Audit and update all dependencies (Bun packages, Go modules, Rust crates)
- **Why**: Several packages are likely outdated (e.g., GORM, Gin, Axum versions)
- **Priority**: P3
- **Effort**: 1 day per service

---

## Architecture Decisions

### Project Structure (Monorepo)

```
petpay-app/
├── Identity/                          # TS/Bun/Express — Auth, Users, OAuth
│   └── src/
│       ├── application/               # Use cases, DTOs, ports
│       ├── domain/                    # Entities, errors, events, repos
│       └── infrastructure/           # Express, Drizzle, RabbitMQ, DI
│
├── marketplace/                       # Go/Gin — Orders management
│   └── internal/
│       ├── application/               # Services, DTOs, core entities
│       ├── domain/                    # Domain entities (order, errors)
│       ├── ports/                     # Repository interfaces
│       └── infrastructure/           # GORM repos, Gin HTTP, config
│
├── catalog-&-offers/                  # Go/Gin — Products & categories
│   └── internal/                      # (same hexagonal structure)
│
├── bookings-service/                  # Go/Gin — Pet booking, scheduling
│   └── internal/                      # (same hexagonal structure)
│
├── payments-service/                  # Rust/Axum — Payments, invoices, coupons
│   └── src/
│       ├── domain/                    # Payment, Invoice, Coupon entities
│       ├── ports/                     # Repository + service traits
│       ├── application/               # Commands, queries, DTOs
│       └── infrastructure/           # SeaORM, Axum, RabbitMQ, Stripe/PayPal
│
├── k8s/                               # Kubernetes manifests (Kustomize)
│   ├── base/                          # Common resources for all envs
│   ├── overlays/dev/                  # Dev overrides (1 replica, debug logs)
│   └── overlays/prod/                 # Prod overrides (3 replicas, 1Gi)
│
├── postgres/                          # DB init scripts
├── tests/integration/                 # Cross-service integration tests
├── docker-compose.yml                 # Local development stack
└── .github/workflows/                 # CI/CD pipelines
```

### Service Communication

| Pattern | Technology | Examples |
|---------|------------|----------|
| REST (sync) | HTTP/JSON | Identity -> Payments (email), Marketplace -> Payments (order validation) |
| Events (async) | RabbitMQ topic exchange `petpay.domain.events` | Bookings -> Payments (booking.*), Identity -> all (user.*) |
| API Gateway | KrakenD (port 8000) | Routes to all services by path prefix |

### Event Contracts

Shared TypeScript types in `Identity/src/domain/events/SharedEventTypes.ts`:

```typescript
interface BookingEvent {
  eventType: 'booking.created' | 'booking.confirmed' | 'booking.completed'
            | 'booking.cancelled' | 'booking.rescheduled'
  bookingId: string; customerId: string; serviceType: string
  status: string; timestamp: string
}
interface UserEvent {
  eventType: 'user.created' | 'service.provider.registered'
  userId: number; email: string; fullName: string; role: string; timestamp: string
}
type DomainEvent = BookingEvent | UserEvent
```

### Database Strategy

| Service | Database | ORM | Migrations |
|---------|----------|-----|------------|
| Identity | `petpay_identity` | Drizzle ORM | Drizzle Kit (`bunx drizzle-kit generate/push`) |
| Marketplace | `petpay_marketplace` | GORM | GORM AutoMigrate |
| Catalog | `petpay_catalog` | GORM | GORM AutoMigrate |
| Bookings | `petpay_bookings` | GORM | GORM AutoMigrate |
| Payments | `petpay_payments` | SeaORM | Custom Migrator (`Migrator::up()`) |

Databases created by `postgres/init.sql` at Postgres container startup.

### Conventions

| Convention | How |
|------------|-----|
| Architecture | Hexagonal (Ports & Adapters) in all services |
| DI | Constructor injection — tsyringe (TS), manual constructors (Go), trait-based (Rust) |
| Error handling | DomainError hierarchy with HTTP status mapping in all services |
| DTO layer | Separate request/response types decoupled from DB models |
| Context propagation | Go: `context.Context` first param; Rust: request-scoped tracing; TS: Express req |
| Graceful shutdown | SIGINT/SIGTERM handler in all Go + Rust services |
| Logging | TS: custom logger; Go: `log`; Rust: `tracing` |
| Pagination | `?page=1&limit=20` query params with pagination metadata in responses |
| Testing | `_test.go` / `.test.ts` / `_test.rs` alongside source; integration tests in `tests/` |

---

## Test Strategy

### Unit Tests

| Service | Target Coverage | Current | Command |
|---------|----------------|---------|---------|
| Identity | 80%+ | ~60% | `bun test --coverage` |
| Marketplace | 70%+ | ~30% | `go test -v -short ./...` |
| Catalog | 70%+ | ~25% | `go test -v -short ./...` |
| Bookings | 75%+ | ~50% | `go test -v -short ./...` |
| Payments | 75%+ | ~40% | `cargo test --lib` |

### Integration Tests

**Infrastructure**: `tests/integration/docker-compose.test.yml` spins up all services + test-runner container with Go, Bun, Rust runtimes.

**Run command**: `./tests/integration/run.sh`

**Coverage by service**:
- Identity: API auth flow (register/login/refresh/logout), RabbitMQ event publishing
- Marketplace: Order CRUD, health checks
- Catalog: Product CRUD, category filtering, health checks
- Bookings: Booking CRUD, status transitions, error cases
- Payments: HTTP API (create payment, list invoices, coupon validation), testcontainers DB (repository layer)
- Cross-service: Full end-to-end flows (register user -> create order -> process payment)

### E2E Tests

`tests/integration/cross-service/cross-service.test.ts` — 522 lines
- Identity -> Marketplace: Register user, login, verify token
- Identity -> Payments: Auth flow for payment endpoints
- Full flow: Register -> Create booking (needs RMQ) -> Verify event published
- Cleanup: Tear down test data

### CI Integration

```
ci.yml -> lint -> unit-tests (matrix) -> integration-tests (main only) -> docker-build (matrix)
```

---

## Docker Compose Services

| Service | Internal Port | Host Port | Dependencies |
|---------|---------------|-----------|-------------|
| Identity | 3000 | 3000 | postgres, redis |
| Marketplace | 8080 | 8080 | postgres |
| Catalog | 8081 | 8081 | postgres |
| Bookings | 8082 | 8082 | postgres, rabbitmq |
| Payments | 8083 | 8083 | postgres, identity |
| KrakenD | 8080 | 8000 | all services |
| PostgreSQL | 5432 | 5433 | — |
| Redis | 6379 | 6379 | — |
| RabbitMQ | 5672/15672 | 5672/15672 | — |

All services on `petpay-network` bridge, `restart: unless-stopped`.

---

## Error Handling Pattern

Every service implements a typed domain error hierarchy with HTTP status mapping:

```go
// Go pattern (marketplace/internal/application/errors/domain_errors.go)
type DomainError struct {
    Code       string `json:"code"`
    Message    string `json:"message"`
    StatusCode int    `json:"-"`
}
func NotFound(resource, id string) *DomainError { ... }
func ValidationFailed(msg string) *DomainError { ... }
func Conflict(msg string) *DomainError { ... }
func Internal(msg string) *DomainError { ... }
```

```typescript
// TS pattern (Identity/src/domain/errors/DomainError.ts)
class DomainError extends Error {
  readonly suggestedHttpCode: number;
  readonly code: string;
}
class NotFoundError extends DomainError { ... }
class ValidationError extends DomainError { ... }
class ConflictError extends DomainError { ... }
class UnauthorizedError extends DomainError { ... }
```

```rust
// Rust pattern (payments-service/src/error.rs)
struct ApiError {
    code: String,
    message: String,
    details: Option<Value>,
}
// Factory: not_found(), validation(), internal(), with_details()
// IntoResponse maps code -> HTTP status code
```

---

## Known Gaps (Honest Assessment)

| Gap | Impact | Notes |
|-----|--------|-------|
| Stripe/PayPal are stubs | Cannot process real payments | Placeholder API keys in docker-compose.yml |
| Payments event consumer logs only | booking.* events have no real effect | match arms call `info!()` and return `Ok(())` |
| Identity event consumer logs only | user.created/service.provider.registered events have no effect | Only `logger.info()` in handler |
| No NetworkPolicies | Any pod can reach any other pod | Full mesh network access |
| No TLS | All traffic unencrypted | HTTP, not HTTPS |
| Marketplace/Catalog DB_NAME in k8s still `petpay` | Would connect to wrong DB in K8s | Docker compose has correct separate DBs |
| Catalog directory name has `&` | Shell/CI tooling issues | `catalog-&-offers/` needs quoting everywhere |
| No HPA | Static replica counts | Manual scaling only |
| No PodDisruptionBudget | Pods can all be evicted simultaneously | No HA guarantees |
| Identity graceful shutdown not implemented | Connection drops on pod termination | Only Go services have graceful shutdown |
| Identity lacks context.Context in DB calls | No request cancellation | Uses pool-level defaults |

---

## Quick Reference

### Useful Commands

```bash
# Build all services
(cd Identity && bun install)
(cd marketplace && go mod download && go build -o bin/service ./cmd/main.go)
(cd catalog-&-offers && go mod download && go build -o bin/service ./cmd/main.go)
(cd bookings-service && go mod download && go build -o bin/service ./cmd/main.go)
(cd payments-service && cargo build)

# Run all unit tests
(cd Identity && bun test --coverage)
(cd marketplace && go test -v -short ./...)
(cd catalog-&-offers && go test -v -short ./...)
(cd bookings-service && go test -v -short ./...)
(cd payments-service && cargo test --lib)

# Run integration tests
./tests/integration/run.sh

# Lint all services
(cd Identity && bun run lint:fix)
(cd marketplace && go fmt ./... && go vet ./...)
(cd catalog-&-offers && go fmt ./... && go vet ./...)
(cd bookings-service && go fmt ./... && go vet ./...)
(cd payments-service && cargo fmt && cargo clippy -- -D warnings)

# Local development
docker compose up -d --build

# Deploy to Kubernetes (dev)
kubectl apply -k k8s/overlays/dev

# Deploy to Kubernetes (prod)
kubectl apply -k k8s/overlays/prod
```
