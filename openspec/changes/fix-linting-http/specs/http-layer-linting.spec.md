# Delta for HTTP Layer Linting

## ADDED Requirements

### Requirement: Fix strict-boolean-expressions in Controllers

The HTTP controllers MUST use explicit null/undefined checks instead of implicit boolean coercion for nullable values.

#### Scenario: Fix OAuthController nullable string checks

- GIVEN `OAuthController.ts` contains `process.env.FRONTEND_URL || 'http://localhost:5173'`
- WHEN the linter checks for nullable string values
- THEN the code MUST use nullish coalescing: `process.env.FRONTEND_URL ?? 'http://localhost:5173'`
- AND the strict-boolean-expressions rule MUST pass

#### Scenario: Fix OAuthController provider validation

- GIVEN `OAuthController.ts` line 179 checks `if (!provider)`
- WHEN the linter checks for nullable string values
- THEN the code MUST use explicit check: `if (provider === null || provider === undefined || provider === '')`
- AND similar fixes MUST be applied to line 188

#### Scenario: Fix OAuthController template literal

- GIVEN `OAuthController.ts` line 191 uses `provider` in template literal
- WHEN the linter checks for invalid template expression types
- THEN the code MUST ensure provider is not `undefined` before use

#### Scenario: Fix OAuthController code/state validation

- GIVEN `OAuthController.ts` line 197 checks `if (!code || !state)`
- WHEN the linter checks for strict boolean expressions
- THEN the code MUST use explicit null checks: `if (code === null || code === undefined || state === null || state === undefined)`

#### Scenario: Fix auth-controller.ts error handling

- GIVEN `auth-controller.ts` line 289 checks `(error).message`
- WHEN the linter checks for any value in conditional
- THEN the code MUST explicitly check for truthy message

### Requirement: Fix strict-boolean-expressions in Middleware

The middleware files MUST use explicit null/undefined checks.

#### Scenario: Fix auth.middleware.ts token check

- GIVEN `auth.middleware.ts` line 21 checks `if (!token)`
- WHEN the linter checks for nullable string values
- THEN the code MUST use explicit check: `if (token === null || token === undefined)`

#### Scenario: Fix rate-limiter.ts IP generation

- GIVEN `rate-limiter.ts` line 27 uses `req.ip || 'unknown'`
- WHEN the linter checks for nullable string values
- THEN the code MUST use nullish coalescing: `req.ip ?? 'unknown'`

### Requirement: Fix explicit-function-return-type in middleware and routes

The functions MUST have explicit return type annotations.

#### Scenario: Fix auth.middleware.ts return type

- GIVEN `auth.middleware.ts` line 16 declares function without return type
- WHEN the linter checks for explicit function return type
- THEN the function MUST be declared with explicit return type

#### Scenario: Fix auth.routes.ts return type

- GIVEN `auth.routes.ts` line 11 declares getter function without return type
- WHEN the linter checks for explicit function return type
- THEN the function MUST have return type

#### Scenario: Fix oauth.routes.ts return types

- GIVEN `oauth.routes.ts` line 9 declares getter function without return type
- WHEN the linter checks for explicit function return type
- THEN the function MUST have return type

### Requirement: Fix no-floating-promises in oauth.routes.ts

The async route handlers MUST properly handle promises.

#### Scenario: Fix callback promise handling

- GIVEN `oauth.routes.ts` line 18 calls async controller method without await
- WHEN the linter checks for floating promises
- THEN the handler MUST use `.catch()` or `void` operator

#### Scenario: Fix linkProvider promise handling

- GIVEN `oauth.routes.ts` line 23 calls async controller method without await
- WHEN the linter checks for floating promises
- THEN the handler MUST use `.catch()` or `void` operator

### Requirement: Fix unused imports in validation schemas

The validation schemas MUST not have unused imports.

#### Scenario: Fix login-schema.ts unused import

- GIVEN `login-schema.ts` line 1 imports `e` from 'express' but never uses it
- WHEN the linter checks for unused variables
- THEN the import MUST be removed

### Requirement: Fix strict-boolean-expressions in register-schema.ts

The validation schema transformations MUST use explicit checks.

#### Scenario: Fix register-schema.ts transform

- GIVEN `register-schema.ts` line 28 checks value in boolean context
- WHEN the linter checks for string value in conditional
- THEN the code MUST use explicit empty string check
- AND line 36 MUST use nullish coalescing instead of logical or

## MODIFIED Requirements

No existing requirements are being modified. This is a new specification for linting fixes.

## REMOVED Requirements

No existing requirements are being removed.

## Verification Criteria

- All linting errors in HTTP layer files are resolved
- `bun run lint` passes without errors in affected files
- Existing tests continue to pass
- No functional changes to behavior