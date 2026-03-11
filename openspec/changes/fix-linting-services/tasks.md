# Tasks: Fix Linting Errors in Identity Services

## Phase 1: Foundation / Infrastructure (Type Safety Setup)

- [ ] 1.1 Create `types.ts` in `Identity/src/infrastructure/services/` to define config validation types if needed (optional based on design review)

## Phase 2: Core Implementation

### JwtTokenProvider.ts (7 errors)
- [ ] 2.1 Replace `||` with `??` for role fallback in `generateTokens()` method at `Identity/src/infrastructure/services/JwtTokenProvider.ts:39`
- [ ] 2.2 Remove redundant `as SignOptions` type assertions in `jwt.sign()` calls at lines 42, 46, 67, 71, 98 in `Identity/src/infrastructure/services/JwtTokenProvider.ts`

### GoogleOAuthProvider.ts (7 errors)
- [ ] 2.3 Replace non-null assertions (`!`) with explicit config validation in constructor at `Identity/src/infrastructure/services/GoogleOAuthProvider.ts:21-23`
- [ ] 2.4 Fix strict-boolean-expressions error for nullable string check at `Identity/src/infrastructure/services/GoogleOAuthProvider.ts:54`
- [ ] 2.5 Fix strict-boolean-expressions error for nullable number check at `Identity/src/infrastructure/services/GoogleOAuthProvider.ts:61`
- [ ] 2.6 Fix strict-boolean-expressions errors for string checks at `Identity/src/infrastructure/services/GoogleOAuthProvider.ts:90`

### GitHubOAuthProvider.ts (6 errors)
- [ ] 2.7 Replace non-null assertions (`!`) with explicit config validation in constructor at `Identity/src/infrastructure/services/GitHubOAuthProvider.ts:22-24`
- [ ] 2.8 Fix strict-boolean-expressions error for empty string check at `Identity/src/infrastructure/services/GitHubOAuthProvider.ts:69`
- [ ] 2.9 Fix strict-boolean-expressions errors for nullable string checks at `Identity/src/infrastructure/services/GitHubOAuthProvider.ts:107` and `:126`

### RabbitMQEventPublisher.ts (2 errors)
- [ ] 2.10 Fix `no-floating-promises` error by awaiting or handling promise at `Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts:29`
- [ ] 2.11 Remove `as any` usage in `close()` method at `Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts:107`

## Phase 3: Testing / Verification

- [ ] 3.1 Run `bun run lint` in `Identity/` directory to verify all linting errors are resolved
- [ ] 3.2 Run `bun run typecheck` (if available) or `tsc --noEmit` to ensure no TypeScript errors
- [ ] 3.3 Verify JwtTokenProvider runtime behavior with empty roles array (manual test or unit test if exists)
- [ ] 3.4 Verify OAuth providers initialization with missing config throws appropriate errors (manual test or unit test if exists)

## Phase 4: Cleanup / Documentation

- [ ] 4.1 Update comments in `JwtTokenProvider.ts` to reflect nullish coalescing usage
- [ ] 4.2 Ensure all config validation errors are descriptive and helpful
