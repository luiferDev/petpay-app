# Proposal: Fix Dependency Injection Issue in Identity Service

## Intent

Fix the tsyringe Dependency Injection issue preventing `/auth/register` and `/auth/login` endpoints from working in the Identity service. The endpoints return Internal Server Error with the error: `Cannot inject the dependency "registerUseCase" at position #0 of "AuthController" constructor. Reason: TypeInfo not known for "RegisterUserUseCase"`.

## Scope

### In Scope
- Add `@injectable()` decorators to `RegisterUserUseCase` class
- Add `@injectable()` decorators to `LoginUseCase` class
- Verify auth endpoints work correctly after fix
- Ensure health endpoint continues to work

### Out of Scope
- Refactoring other services (Marketplace, Catalog)
- Changing the DI container architecture
- Adding new authentication methods

## Approach

**Root Cause**: The `RegisterUserUseCase` and `LoginUseCase` classes are not decorated with `@injectable()` from tsyringe. While `AuthController` has the `@injectable()` decorator and uses `@inject()` for its dependencies, tsyringe requires all classes in the injection chain to be decorated for proper TypeScript metadata resolution.

**Fix**: Add `@injectable()` decorator to both use case classes:
1. `Identity/src/application/use-case/auth/RegisterUserUseCase.ts`
2. `Identity/src/application/use-case/auth/LoginUseCase.ts`

This is the standard pattern for tsyringe - any class that will be injected must be decorated with `@injectable()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/application/use-case/auth/RegisterUserUseCase.ts` | Modified | Add `@injectable()` decorator |
| `Identity/src/application/use-case/auth/LoginUseCase.ts` | Modified | Add `@injectable()` decorator |
| `Identity/src/infrastructure/http/routes/auth.routes.ts` | Review | Verify route handlers match controller methods |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing functionality | Low | Add decorators only, no logic changes; test health endpoint |
| Runtime errors after fix | Low | Run existing tests to verify DI resolution works |

## Rollback Plan

1. Remove `@injectable()` decorators from both use case files
2. Redeploy if needed
3. The service will return to the previous broken state, confirming the fix

## Dependencies

- None - all dependencies already in place (tsyringe, reflect-metadata)

## Success Criteria

- [ ] GET /health returns 200 OK
- [ ] POST /auth/register returns expected response (not 500 Internal Server Error)
- [ ] POST /auth/login returns expected response (not 500 Internal Server Error)
- [ ] Unit tests pass (`bun test`)
