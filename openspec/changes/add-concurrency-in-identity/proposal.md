# Proposal: Add Concurrency in Identity

## Intent

The Identity service has race conditions in the registration flow where the `existsByEmail()` check followed by `save()` is vulnerable to concurrent requests trying to register the same email simultaneously. This change addresses the critical issue of duplicate user registrations and data inconsistency due to race conditions.

## Scope

### In Scope
- Fix race condition in `RegisterUserUseCase.ts` registration flow
- Implement SERIALIZABLE isolation level for registration transactions in `DrizzleUserAdapter.ts`
- Add advisory locks for email verification flow in `auth-controller.ts`
- Connection pool optimization for improved concurrency handling

### Out of Scope
- Changes to Marketplace or Catalog services
- Major architectural changes beyond concurrency fixes
- Performance optimization beyond concurrency-related improvements

## Approach

1. **Primary Fix (SERIALIZABLE Isolation)**: Apply SERIALIZABLE isolation level to registration transactions to prevent concurrent writes to the same email address. This ensures transactions are executed serially, preventing race conditions.

2. **Secondary Fix (Advisory Locks)**: Implement PostgreSQL advisory locks for email verification flow to prevent concurrent verification attempts for the same email/token.

3. **Tertiary Improvement (Connection Pool)**: Optimize connection pool settings to handle concurrent requests more efficiently without overwhelming the database.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/use-cases/RegisterUserUseCase.ts` | Modified | Registration flow with enhanced race condition protection |
| `Identity/src/drizzle/DrizzleUserAdapter.ts` | Modified | Repository layer with SERIALIZABLE transactions |
| `Identity/src/controllers/auth-controller.ts` | Modified | Email verification endpoint with advisory locks |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Database locking causing performance degradation | Medium | Monitor transaction times; use connection pooling effectively |
| SERIALIZABLE isolation causing deadlocks | Low | Implement proper error handling and retry logic |
| Advisory locks not releasing properly | Low | Use try-finally blocks to ensure lock release |
| Breaking existing functionality | Low | Comprehensive testing before deployment |

## Rollback Plan

1. **Immediate Rollback**: Revert to previous Git commit if critical issues arise
2. **Database Configuration**: Revert isolation level changes in transaction configuration
3. **Code Rollback**: Remove advisory lock implementation and revert to previous verification logic
4. **Connection Pool**: Restore previous connection pool settings

## Dependencies

- PostgreSQL database (already in use)
- Drizzle ORM (already configured)
- Bun runtime (already in use)

## Success Criteria

- [ ] No duplicate user registrations occur under concurrent load testing
- [ ] SERIALIZABLE transactions successfully prevent race conditions
- [ ] Advisory locks properly manage concurrent email verification attempts
- [ ] Connection pool handles concurrent requests without timeouts
- [ ] All existing tests pass
- [ ] Performance metrics show no significant degradation
