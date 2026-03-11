# Tasks: Fix Linting Errors in Identity HTTP Layer

## Phase 1: Validation Schemas (Foundation)

- [ ] 1.1 Remove unused `e` import from `Identity/src/infrastructure/http/validation/zod-schemas/login-schema.ts` line 1
- [ ] 1.2 Fix line 28 in `Identity/src/infrastructure/http/validation/zod-schemas/register-schema.ts` - replace implicit boolean check with explicit empty string check
- [ ] 1.3 Fix line 36 in `Identity/src/infrastructure/http/validation/zod-schemas/register-schema.ts` - replace `||` with `??` for nullish coalescing

## Phase 2: Middleware

- [ ] 2.1 Add explicit return type to `auth.middleware.ts` line 16 - function declaration needs `Response` return type
- [ ] 2.2 Fix line 21 in `Identity/src/infrastructure/http/middlewares/auth.middleware.ts` - replace `if (!token)` with explicit null/undefined check
- [ ] 2.3 Fix line 27 in `Identity/src/infrastructure/http/middlewares/rate-limiter.ts` - replace `req.ip || 'unknown'` with `req.ip ?? 'unknown'`

## Phase 3: Controllers

- [ ] 3.1 Fix line 158 in `Identity/src/infrastructure/http/controllers/OAuthController.ts` - replace `||` with `??` for FRONTEND_URL
- [ ] 3.2 Fix line 164 in `Identity/src/infrastructure/http/controllers/OAuthController.ts` - replace `||` with `??` for FRONTEND_URL
- [ ] 3.3 Fix line 179 in `Identity/src/infrastructure/http/controllers/OAuthController.ts` - replace `if (!provider)` with explicit null/undefined/empty check
- [ ] 3.4 Fix line 188 in `Identity/src/infrastructure/http/controllers/OAuthController.ts` - replace implicit check with explicit null/undefined/empty check
- [ ] 3.5 Fix line 191 in `Identity/src/infrastructure/http/controllers/OAuthController.ts` - ensure provider is not undefined before template literal use
- [ ] 3.6 Fix line 197 in `Identity/src/infrastructure/http/controllers/OAuthController.ts` - replace `if (!code || !state)` with explicit null/undefined checks
- [ ] 3.7 Fix line 289 in `Identity/src/infrastructure/http/controllers/auth-controller.ts` - fix `(error).message` type check with explicit truthy message validation

## Phase 4: Routes

- [ ] 4.1 Add explicit return type to line 11 getter function in `Identity/src/infrastructure/http/routes/auth.routes.ts`
- [ ] 4.2 Add explicit return type to line 9 getter function in `Identity/src/infrastructure/http/routes/oauth.routes.ts`
- [ ] 4.3 Fix line 18 in `Identity/src/infrastructure/http/routes/oauth.routes.ts` - add `void` operator or `.catch()` for async controller call
- [ ] 4.4 Fix line 23 in `Identity/src/infrastructure/http/routes/oauth.routes.ts` - add `void` operator or `.catch()` for async controller call

## Phase 5: Test Files

- [ ] 5.1 Fix line 43 in `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` - explicit any check
- [ ] 5.2 Remove unreachable code line 48 in `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts`
- [ ] 5.3 Remove unused stateManager variable line 11 in `Identity/src/infrastructure/http/controllers/__tests__/OAuthController.test.ts`
- [ ] 5.4 Fix template literal line 187 in `Identity/src/infrastructure/http/controllers/__tests__/OAuthController.test.ts`

## Phase 6: Verification

- [ ] 6.1 Run `bun run lint` to verify all linting errors are resolved
- [ ] 6.2 Run `bun test` to verify no regression in existing tests