# Proposal: Fix Linting Errors in Identity Service Test Files

## Intent

Resolve 11 linting errors in Identity service test files to ensure code quality and adherence to project standards (ts-standard). This addresses specific rule violations (`prefer-promise-reject-errors`, `strict-boolean-expressions`, `no-floating-promises`, `restrict-template-expressions`) identified in test files.

## Scope

### In Scope
- Fix linting errors in `LoginUseCase.test.ts`
- Fix linting errors in `RegisterUserUseCase.concurrency.test.ts`
- Fix linting errors in `OAuthLoginUseCase.test.ts`
- Fix linting errors in `auth-controller.concurrency.test.ts`
- Fix linting errors in `OAuthController.test.ts`
- Apply Context7 guidance for specific error types

### Out of Scope
- Changes to production logic
- Refactoring test logic beyond lint fixes
- Linting errors in other services (Marketplace, Catalog)

## Approach

We will apply the specific Context7 guidance patterns to resolve each error type:

1. **prefer-promise-reject-errors**: Reject with `new Error('message')` not plain objects
   - Change: `Promise.reject({ code: '40001' })` → `Promise.reject(new Error('40001'))`
   - Note: If error code needs preservation, wrap in Error object or use custom Error class

2. **no-floating-promises**: Use `void` keyword for mocked module imports
   - Change: `mock.module('path', () => ({ ... }))` → `void mock.module('path', () => ({ ... }))`
   - This explicitly marks the promise as intentionally not awaited

3. **restrict-template-expressions**: Use type assertions for potentially undefined values
   - Change: `${value}` → `${value as string}` (or appropriate type)
   - Ensure type safety in template literals

4. **strict-boolean-expressions**: Use explicit checks for any values
   - Change: `error.code === '40001'` → `(error as any).code === '40001'`
   - Alternatively, define proper types for error objects

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/application/use-cases/auth/LoginUseCase.test.ts` | Modified | Fix 4 lint errors (prefer-promise-reject-errors, strict-boolean-expressions) |
| `Identity/src/application/use-cases/auth/RegisterUserUseCase.concurrency.test.ts` | Modified | Fix 2 lint errors (no-floating-promises, restrict-template-expressions) |
| `Identity/src/application/use-cases/auth/OAuthLoginUseCase.test.ts` | Modified | Fix 2 lint errors (prefer-promise-reject-errors, no-floating-promises) |
| `Identity/src/application/use-cases/auth/auth-controller.concurrency.test.ts` | Modified | Fix 2 lint errors (strict-boolean-expressions, restrict-template-expressions) |
| `Identity/src/application/use-cases/auth/OAuthController.test.ts` | Modified | Fix 1 lint error (prefer-promise-reject-errors) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking test logic during lint fixes | Low | Review changes to ensure test behavior unchanged |
| Incorrect type assertions masking real issues | Low | Use minimal necessary assertions; prefer proper typing |
| Missing lint errors in other test files | Medium | Run `bun run lint` post-fix to verify no remaining errors |

## Rollback Plan

1. If tests fail after changes, revert the specific file changes using git
2. If linting still fails, run `bun run lint:fix` and review auto-fixes
3. If issues persist, restore from git stash or previous commit

## Dependencies

- Bun runtime for linting
- ts-standard linter configuration

## Success Criteria

- [ ] All 11 linting errors resolved
- [ ] `bun run lint` passes in Identity service
- [ ] All affected tests still pass
- [ ] No new linting errors introduced
