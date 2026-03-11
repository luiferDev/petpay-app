# Proposal: fix-linting-http

## Intent

Fix 28 linting errors in Identity service HTTP layer files to improve code quality and pass ts-standard linting rules without violations.

## Scope

4 files affected in HTTP layer only (controllers, middleware, routes, validation):

- auth-controller.ts (4 errors remaining)
- OAuthController.ts (9 errors)
- auth-controller.concurrency.test.ts (3 errors)
- OAuthController.test.ts (3 errors)
- auth.middleware.ts (1 error)
- rate-limiter.ts (2 errors)
- auth.routes.ts (1 error)
- oauth.routes.ts (3 errors)
- login-schema.ts (3 errors)
- register-schema.ts (3 errors)

Total: 28 errors across 10 files

## Approach

Apply Context7 MCP guidance patterns:

1. **strict-boolean-expressions**: Replace implicit boolean checks with explicit comparisons
   - `if (value)` → `if (value !== null && value !== undefined)`
   - `if (!value)` → `if (value === null || value === undefined)`

2. **prefer-nullish-coalescing**: Replace `||` with `??` for optional values
   - `value || default` → `value ?? default`

3. **no-unused-vars**: Remove unused variables and imports

4. **strict-boolean-expressions**: Use explicit type checks for any values

## Technical Changes

### Controllers
- Fix nullable string conditionals
- Fix strict-boolean-expressions with explicit null checks

### Middleware
- Fix any value comparisons
- Remove unused variables

### Routes
- Fix nullable string in route handlers

### Validation Schemas
- Fix template literal type errors

## Success Criteria

- All 28 linting errors resolved
- All existing tests pass
- No regression in functionality

## Risks

- **Low Risk**: Changes are linting fixes only
- **Mitigation**: Run full test suite after changes

## Dependencies

- None - this is an independent change

## Timeline

- Implementation: 1-2 hours
- Testing: 30 minutes