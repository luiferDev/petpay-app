# Rollback Documentation: Add Concurrency in Identity

## Overview

This document outlines the steps to revert the concurrency improvements made to the Identity service. These changes include SERIALIZABLE isolation, advisory locks, and connection pool optimizations.

## Rollback Procedure

### 1. Immediate Rollback (Emergency)

If critical issues arise after deployment, revert to the previous Git commit:

```bash
git revert HEAD
git push origin main
```

### 2. Database Configuration Rollback

#### 2.1 Revert SERIALIZABLE Isolation

**File**: `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts`

Remove the SERIALIZABLE isolation and retry logic from the `save()` method:

```typescript
// BEFORE (with concurrency)
public async save (user: User): Promise<User> {
  const isNewUser = !user.id

  const retryConfig = {
    maxRetries: Config.CONCURRENCY_MAX_RETRIES,
    initialDelayMs: Config.CONCURRENCY_RETRY_DELAY_MS,
    maxDelayMs: 5000,
    backoffFactor: Config.CONCURRENCY_BACKOFF_FACTOR
  }

  return await executeWithRetry(
    async () => {
      return await this.db.transaction(async (tx) => {
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`)
        // ... rest of the transaction
      })
    },
    retryConfig,
    isSerializationError
  )
}

// AFTER (reverted)
public async save (user: User): Promise<User> {
  const isNewUser = !user.id

  return await this.db.transaction(async (tx) => {
    // ... rest of the transaction without SERIALIZABLE
  })
}
```

### 3. Code Rollback

#### 3.1 Remove Advisory Lock Implementation

**File**: `Identity/src/infrastructure/http/controllers/auth-controller.ts`

Remove advisory lock logic from `verifyEmail()`:

```typescript
// BEFORE (with advisory lock)
verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params
    const lockKey = this.calculateLockKey(userId)

    await withAdvisoryLock(
      getDb(),
      lockKey,
      { timeoutMs: Config.ADVISORY_LOCK_TIMEOUT_MS },
      async () => {
        // ... verification logic
      }
    )
    // ...
  } catch (error: any) {
    if (error.message?.includes('Lock timeout')) {
      res.status(423).send('<h1>El servicio está ocupado...</h1>')
    }
    // ...
  }
}

// AFTER (reverted)
verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params

    if (!userId) {
      res.status(400).send('<h1>ID de usuario inválido</h1>')
      return
    }

    const userRepository = container.resolve<any>(INJECTION_TOKENS.USER_REPOSITORY)
    const user = await userRepository.findById(userId)

    if (!user) {
      res.status(404).send('<h1>Usuario no encontrado</h1>')
      return
    }

    user.markAsVerified()
    await userRepository.save(user)

    logger.info('Email verified successfully', { userId: user.id, email: user.email })

    res.status(200).render('verifySuccess')
  } catch (error) {
    logger.error('Error verifying email', { error })
    res.status(500).send('<h1>Error al verificar el email.</h1>')
  }
}
```

**File**: `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts`

Remove advisory lock helper methods:

```typescript
// Remove these methods from DrizzleUserAdapter:
// - acquireLock(lockKey: number, timeoutMs: number): Promise<boolean>
// - releaseLock(lockKey: number): Promise<void>
```

#### 3.2 Remove RegisterUserUseCase Changes

**File**: `Identity/src/application/use-case/auth/RegisterUserUseCase.ts`

Restore the `existsByEmail()` check before transaction:

```typescript
// BEFORE (with concurrency)
public async execute (request: RegisterUserRequest): Promise<UserResponse> {
  const { email, password, firstName, lastName, role } = request

  // 1. Hashear la contraseña
  const passwordHash = await hash(password, this.SALT_ROUNDS)
  // ... rest without existsByEmail check
  try {
    const savedUser = await this.userRepository.save(user)
    // ...
  } catch (error: any) {
    if (error.code === '23505' || error.sqlState === '23505') {
      throw new UserAlreadyExistsError(`Email ${email} is already registered.`)
    }
    throw error
  }
}

// AFTER (reverted)
public async execute (request: RegisterUserRequest): Promise<UserResponse> {
  const { email, password, firstName, lastName, role } = request

  // 1. Verificar si el email ya existe (Regla de negocio crítica)
  const emailExists = await this.userRepository.existsByEmail(email)
  if (emailExists) {
    throw new UserAlreadyExistsError(`Email ${email} is already registered.`)
  }

  // 2. Hashear la contraseña
  const passwordHash = await hash(password, this.SALT_ROUNDS)
  // ... rest of the method
  const savedUser = await this.userRepository.save(user)
  // ...
}
```

### 4. Connection Pool Rollback

**File**: `Identity/src/infrastructure/database/drizzle/client.ts`

Restore previous connection pool settings:

```typescript
// BEFORE (with configurable pool)
function getPoolConfig (): PoolConfig {
  const maxSize = parseInt(process.env.POOL_MAX_SIZE ?? '20', 10)
  const adjustedMax = process.env.NODE_ENV === 'production' ? Math.min(maxSize, 100) : Math.min(maxSize, 20)
  return {
    max: adjustedMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
}

// AFTER (reverted to hardcoded)
const pool = new Pool({
  connectionString,
  max: 20, // Pool size definido en consideraciones de performance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

### 5. Environment Configuration Rollback

**File**: `Identity/src/infrastructure/config/env.ts`

Remove concurrency environment variables:

```typescript
// Remove these from envSchema:
// - CONCURRENCY_MAX_RETRIES
// - CONCURRENCY_RETRY_DELAY_MS
// - CONCURRENCY_BACKOFF_FACTOR
// - ADVISORY_LOCK_TIMEOUT_MS
// - POOL_MAX_SIZE
```

## Testing After Rollback

1. Run the test suite to ensure no regressions:
   ```bash
   cd Identity
   bun test
   ```

2. Run linting to ensure code style compliance:
   ```bash
   bun run lint
   ```

3. Start the development server and test:
   - User registration flow
   - Email verification flow
   - Concurrent registration attempts

## Rollback Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data inconsistency during rollback | Low | High | Rollback during low-traffic period |
| Temporary service interruption | Medium | Medium | Deploy during maintenance window |
| Database lock issues | Low | High | Monitor database performance |

## Rollback Timeline

1. **Immediate**: Revert Git commit (2 minutes)
2. **Short-term**: Remove concurrency code changes (15-30 minutes)
3. **Medium-term**: Restore previous database configuration (5-10 minutes)
4. **Verification**: Test all affected flows (15-30 minutes)

## Success Criteria After Rollback

- [ ] No duplicate user registrations occur
- [ ] Registration flow works without SERIALIZABLE isolation
- [ ] Email verification flow works without advisory locks
- [ ] All existing tests pass
- [ ] No performance degradation observed
- [ ] Database connection pool operates normally