# Tasks: Add Concurrency in Identity

## Phase 1: Foundation / Infrastructure

### 1.1 Add environment variables for concurrency settings

**File**: `Identity/src/infrastructure/config/env.ts`

- [x] Add `CONCURRENCY_MAX_RETRIES` (default: 3) for transaction retry limit
- [x] Add `CONCURRENCY_RETRY_DELAY_MS` (default: 100) for initial retry delay
- [x] Add `CONCURRENCY_BACKOFF_FACTOR` (default: 2) for exponential backoff
- [x] Add `ADVISORY_LOCK_TIMEOUT_MS` (default: 5000) for lock timeout
- [x] Add `POOL_MAX_SIZE` (default: 20) for connection pool max size

### 1.2 Configure connection pool settings

**File**: `Identity/src/infrastructure/database/drizzle/client.ts`

- [x] Update `makeDatabaseClient()` to use configurable pool settings from env
- [x] Update `getDb()` singleton to use configurable pool settings
- [x] Add pool monitoring/logging configuration
- [x] Verify pool settings align with spec requirement: pool size ≥ 20 for 100 concurrent requests

### 1.3 Create concurrency utilities helper file

**File**: `Identity/src/shared/utils/concurrency.ts` (NEW)

- [x] Create `RetryConfig` interface with maxRetries, initialDelayMs, maxDelayMs, backoffFactor
- [x] Create `LockConfig` interface with timeoutMs
- [x] Create `executeWithRetry()` function for transaction retry logic with exponential backoff
- [x] Create `withAdvisoryLock()` function for advisory lock management
- [x] Create `isSerializationError()` helper to detect PostgreSQL error code 40001

## Phase 2: Core Implementation

### 2.1 Implement SERIALIZABLE isolation in DrizzleUserAdapter

**File**: `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts`

- [x] Modify `save()` method to start transaction with SERIALIZABLE isolation level
- [x] Import `executeWithRetry` from concurrency utilities
- [x] Wrap transaction execution with retry logic
- [x] Handle serialization failure errors (PostgreSQL error code 40001)
- [x] Remove `existsByEmail()` check from transaction (now handled by unique constraint)

### 2.2 Update RegisterUserUseCase for atomic registration

**File**: `Identity/src/application/use-case/auth/RegisterUserUseCase.ts`

- [x] Remove `existsByEmail()` check before transaction (race condition vulnerability)
- [x] Wrap `userRepository.save()` with try-catch for unique constraint violations
- [x] Convert unique constraint violations to `UserAlreadyExistsError` (HTTP 409)
- [x] Import retry configuration from environment
- [x] Add logging for retry attempts

### 2.3 Add advisory lock helper methods to DrizzleUserAdapter

**File**: `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts`

- [x] Create `acquireLock(lockKey: number, timeoutMs: number): Promise<boolean>` method
- [x] Create `releaseLock(lockKey: number): Promise<void>` method
- [x] Implement PostgreSQL advisory lock functions using raw SQL queries
- [x] Ensure lock release in finally block

### 2.4 Implement advisory locks in auth-controller verifyEmail

**File**: `Identity/src/infrastructure/http/controllers/auth-controller.ts`

- [x] Import `withAdvisoryLock` from concurrency utilities
- [x] Calculate deterministic lock key from user ID (e.g., `hash(user.id)`)
- [x] Wrap `verifyEmail` endpoint logic with advisory lock
- [x] Handle lock timeout errors (return HTTP 423 Locked)
- [x] Ensure lock is released even if verification fails

## Phase 3: Integration / Wiring

### 3.1 Wire concurrency configuration into DI container

**File**: `Identity/src/infrastructure/DI/container.ts`

- [x] Ensure `Config` from env.ts is available for concurrency settings
- [x] Verify DbClient injection uses updated pool configuration
- [x] Test dependency injection for concurrency utilities

### 3.2 Update error handling for concurrency-specific errors

**File**: `Identity/src/domain/errors/DomainError.ts`

- [x] Add `LockTimeoutError` for advisory lock timeout scenarios
- [x] Ensure `UserAlreadyExistsError` is used for unique constraint violations
- [x] Add `SerializationError` for SERIALIZABLE transaction failures (optional)

### 3.3 Update routes to handle new error responses

**File**: `Identity/src/infrastructure/http/routes/auth.routes.ts`

- [x] Verify `POST /register` handles 409 Conflict responses
- [x] Verify `GET /verify-email/:userId` handles 423 Locked responses
- [x] Add error logging for concurrency failures

## Phase 4: Testing

### 4.1 Write unit tests for transaction retry logic

**File**: `Identity/src/shared/utils/__tests__/concurrency.test.ts` (NEW)

- [x] Test `executeWithRetry()` success on first attempt
- [x] Test `executeWithRetry()` retries on serialization failure (error 40001)
- [x] Test `executeWithRetry()` respects maxRetries limit
- [x] Test `executeWithRetry()` uses exponential backoff delays
- [x] Test `executeWithRetry()` non-retryable errors fail immediately

### 4.2 Write unit tests for advisory lock helper

**File**: `Identity/src/shared/utils/__tests__/concurrency.test.ts` (CONTINUED)

- [x] Test `withAdvisoryLock()` acquires and releases lock successfully
- [x] Test `withAdvisoryLock()` releases lock even if operation fails
- [x] Test `withAdvisoryLock()` respects timeout configuration
- [x] Test `isSerializationError()` correctly identifies error code 40001

### 4.3 Write integration tests for concurrent registration

**File**: `Identity/src/application/use-case/auth/__tests__/RegisterUserUseCase.concurrency.test.ts` (NEW)

- [x] Test concurrent registration with same email returns only one success
- [x] Test concurrent registration returns 409 Conflict for failed attempts
- [x] Test SERIALIZABLE isolation prevents race conditions
- [x] Use `bun:test` with multiple concurrent promises

### 4.4 Write integration tests for concurrent email verification

**File**: `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` (NEW)

- [ ] Test concurrent verification attempts for same user ID
- [ ] Test advisory lock serializes verification attempts
- [ ] Test lock timeout returns HTTP 423
- [ ] Use `bun:test` with concurrent promises

### 4.5 Write load testing setup

**File**: `Identity/src/tests/load/registration-load.test.ts` (NEW)

- [ ] Create load test script using `k6` or similar tool
- [ ] Simulate 100+ concurrent registration requests
- [ ] Verify no duplicate user registrations occur
- [ ] Measure performance impact of SERIALIZABLE isolation

## Phase 5: Cleanup / Documentation

### 5.1 Update AGENTS.md with concurrency patterns

**File**: `Identity/AGENTS.md`

- [ ] Add section on SERIALIZABLE isolation usage
- [ ] Document transaction retry pattern with exponential backoff
- [ ] Add advisory lock usage guidelines
- [ ] Update error handling section for concurrency errors

### 5.2 Add code comments and JSDoc

**File**: `Identity/src/shared/utils/concurrency.ts`

- [ ] Add JSDoc comments for all exported functions
- [ ] Document RetryConfig and LockConfig interfaces
- [ ] Add usage examples in comments

### 5.3 Verify all changes work

- [ ] Run `bun run lint` to check code style
- [ ] Run `bun test` to verify all tests pass
- [ ] Start development server and test registration flow
- [ ] Test email verification flow
- [ ] Monitor logs for retry attempts and lock acquisitions

### 5.4 Create rollback documentation

**File**: `openspec/changes/add-concurrency-in-identity/rollback.md` (NEW)

- [ ] Document steps to revert SERIALIZABLE isolation changes
- [ ] Document steps to remove advisory lock implementation
- [ ] Document steps to restore previous connection pool settings
