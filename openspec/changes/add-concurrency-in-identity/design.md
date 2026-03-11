# Design: Add Concurrency in Identity

## Technical Approach

This design addresses the race condition in the Identity service registration flow by implementing three layers of concurrency protection:

1. **SERIALIZABLE Isolation (Primary Fix)**: The registration transaction will use PostgreSQL's SERIALIZABLE isolation level to ensure that concurrent transactions attempting to register the same email are serialized, with the first one succeeding and subsequent ones failing due to unique constraint violations.

2. **Advisory Locks (Secondary Fix)**: For the email verification flow, we will implement PostgreSQL advisory locks to prevent concurrent verification attempts for the same user, ensuring atomic updates of the `isVerified` status.

3. **Connection Pool Optimization**: We will optimize the Drizzle client configuration to handle concurrent requests efficiently, including pool size tuning and monitoring metrics.

The implementation follows the existing clean architecture patterns in the Identity service, ensuring minimal disruption to the current codebase while robustly addressing the concurrency issues identified in the proposal and specs.

## Architecture Decisions

### Decision: SERIALIZABLE Isolation Level

**Choice**: Use PostgreSQL SERIALIZABLE isolation level for all registration transactions in `DrizzleUserAdapter.ts`.

**Alternatives considered**:
- `READ COMMITTED` with `FOR UPDATE` locks: Requires explicit locking logic and is more prone to deadlocks.
- Application-level locking (e.g., Mutex): Not distributed; doesn't work across multiple service instances.
- Optimistic concurrency control (versioning): Requires schema changes and complex conflict resolution.

**Rationale**: SERIALIZABLE is the strongest isolation level provided by PostgreSQL and guarantees that concurrent transactions appear as if they were executed serially. This directly prevents the race condition where two requests simultaneously check for email existence and both proceed to save. While it can cause serialization failures (detectable via error code 40001), these are easily handled with retry logic.

### Decision: Transaction Retry Logic with Exponential Backoff

**Choice**: Implement a retry mechanism for SERIALIZABLE transactions that fail due to serialization anomalies, using exponential backoff.

**Alternatives considered**:
- No retry: Fail immediately, requiring the client to retry.
- Fixed delay retry: Simple but less efficient under high contention.

**Rationale**: Under high concurrency, serialization failures are expected. Retrying with exponential backoff reduces contention and improves the likelihood of success without overwhelming the database. This pattern is standard for handling SERIALIZABLE isolation failures.

### Decision: PostgreSQL Advisory Locks for Email Verification

**Choice**: Use `pg_advisory_lock` and `pg_advisory_unlock` functions to lock on a key derived from the user ID (or email) during email verification.

**Alternatives considered**:
- Application-level locks (Mutex): Not distributed.
- Database row locks (`SELECT ... FOR UPDATE`): Requires an active transaction and can lead to deadlocks if not managed carefully.

**Rationale**: Advisory locks are lightweight and managed by the application, allowing fine-grained control without the overhead of row locks. They are ideal for protecting short, critical sections like email verification updates. We will use a deterministic lock key (e.g., hash of user ID) to ensure consistency.

### Decision: Connection Pool Optimization

**Choice**: Tune the Drizzle client's PostgreSQL pool size based on expected load and implement monitoring.

**Alternatives considered**:
- Dynamic pool sizing: Complex to implement and tune.
- No optimization: Risk of connection exhaustion under load.

**Rationale**: A fixed, well-sized pool (calculated based on expected concurrent requests) prevents connection exhaustion while efficiently utilizing database resources. Monitoring ensures we can adjust based on real-world usage.

## Data Flow

### Registration Flow (with SERIALIZABLE Isolation)

```
Client Request -> AuthController -> RegisterUserUseCase -> DrizzleUserAdapter (Transaction Start)
     |
     +-> Check Email Existence (within transaction)
     |
     +-> [If exists] -> Throw UserAlreadyExistsError -> HTTP 409
     |
     +-> [If not exists] -> Insert User -> Commit Transaction
     |
     +-> [If Serialization Failure] -> Retry with Backoff
     |
     +-> Return UserResponse -> HTTP 201
```

### Email Verification Flow (with Advisory Locks)

```
Client Request -> AuthController -> verifyEmail
     |
     +-> Calculate Lock Key (e.g., hash of user ID)
     |
     +-> Acquire Advisory Lock (pg_advisory_lock)
     |
     +-> [If acquired] -> Update User (markAsVerified, save)
     |
     +-> Release Advisory Lock (pg_advisory_unlock)
     |
     +-> Return Success -> HTTP 200
     |
     +-> [If lock timeout] -> Return HTTP 423 Locked
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/database/drizzle/client.ts` | Modify | Add SERIALIZABLE isolation configuration and connection pool monitoring. |
| `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts` | Modify | Implement SERIALIZABLE transactions with retry logic in `save()` method; add `acquireLock` and `releaseLock` helper methods for advisory locks. |
| `Identity/src/infrastructure/http/controllers/auth-controller.ts` | Modify | Wrap `verifyEmail` endpoint with advisory lock logic. |
| `Identity/src/application/use-case/auth/RegisterUserUseCase.ts` | Modify | Remove `existsByEmail` check (now handled within transaction) and handle serialization failure errors. |
| `Identity/src/shared/utils/concurrency.ts` | Create | Helper functions for transaction retry logic and advisory lock management. |
| `Identity/src/infrastructure/config/env.ts` | Modify | Add configuration for pool size, lock timeout, and retry limits. |

## Interfaces / Contracts

### New Helper Functions (concurrency.ts)

```typescript
// Identity/src/shared/utils/concurrency.ts

import { type DbClient } from '../database/drizzle/client';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export interface LockConfig {
  timeoutMs: number;
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  isRetryableError: (error: any) => boolean
): Promise<T> {
  // Implementation: exponential backoff retry logic
}

export async function withAdvisoryLock<T>(
  db: DbClient,
  lockKey: number,
  config: LockConfig,
  operation: () => Promise<T>
): Promise<T> {
  // Implementation: acquire lock, execute, release lock in finally
}
```

### Drizzle Client Configuration

```typescript
// Identity/src/infrastructure/database/drizzle/client.ts

export interface PoolConfig {
  max: number; // Pool size
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Transaction retry logic | Mock `DbClient` to simulate serialization failures and verify retry behavior. |
| Unit | Advisory lock helper | Mock `DbClient` to verify lock acquisition and release. |
| Integration | Concurrent registration | Use `bun:test` with multiple concurrent promises attempting to register the same email; assert only one succeeds. |
| Integration | Concurrent email verification | Use `bun:test` with multiple concurrent promises attempting to verify the same user; assert only one succeeds. |
| Load | High concurrency registration | Use a load testing tool (e.g., `k6`) to simulate 100+ concurrent registration requests and verify no duplicates occur. |

## Migration / Rollout

**No migration required.**

The changes are backward-compatible and do not modify the database schema. The SERIALIZABLE isolation level is a transaction-level configuration that can be applied without data migration.

**Rollout Plan**:
1. Deploy the updated Identity service.
2. Monitor logs for serialization failures and retry attempts.
3. Adjust `RetryConfig` and `PoolConfig` based on observed metrics.

## Open Questions

- [ ] What is the expected peak concurrent load for the Identity service? (Needed for precise pool size calculation)
- [ ] Should advisory locks be implemented for other critical sections besides email verification? (Scope clarification)
- [ ] What is the acceptable latency impact of SERIALIZABLE isolation and retries? (Performance budget)

