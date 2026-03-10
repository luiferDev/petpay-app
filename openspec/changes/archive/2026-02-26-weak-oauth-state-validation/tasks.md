# Tasks: Fix Weak OAuth State Validation

## Phase 1: Foundation / Infrastructure

- [ ] 1.1 Create `Identity/src/infrastructure/services/OAuthStateManager.ts` with:
  - `generateState()` method returning `{timestamp}:{random}:{signature}` format
  - `validateState(state, cookieState)` method with HMAC verification
  - `isExpired(timestamp, maxAgeMs)` helper method
  - Type definitions: `StatePayload`, `StateValidationResult`

- [ ] 1.2 Update `Identity/src/infrastructure/config/env.ts`:
  - Change `OAUTH_STATE_SECRET` from optional to required (min 32 chars)
  - Add validation in `isOAuthEnabled()` to require the secret

- [ ] 1.3 Verify existing `OAuthInvalidStateError` in domain/errors/OAuthError.ts handles new error types

## Phase 2: Core Implementation

- [x] 2.1 Update `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts`:
  - Replace line 64 `state.length < 16` with call to `OAuthStateManager.validateState()`
  - Parse and validate timestamp within 10-minute window
  - Clear cookie after successful validation (or let controller handle)

- [x] 2.2 Update `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts`:
  - Replace line 53 `state.length < 16` with same validation logic
  - Use shared validation approach

- [x] 2.3 Update `Identity/src/infrastructure/http/controllers/OAuthController.ts`:
  - Import OAuthStateManager
  - In `initiate()`: Generate signed state, set `oauth_state` cookie with httpOnly, secure, maxAge: 600
  - In `callback()`: Read state from cookie, pass to use case for validation
  - In `linkProvider()`: Same cookie flow for account linking

## Phase 3: Integration / Wiring

- [ ] 3.1 Register OAuthStateManager in DI container (Identity/src/infrastructure/DI/container.ts)
  - Add INJECTION_TOKEN for OAuthStateManager
  - Inject OAUTH_STATE_SECRET from Config

- [ ] 3.2 Update callback route to read oauth_state cookie
  - Verify Express has cookie-parser middleware configured

## Phase 4: Testing

- [x] 4.1 Write unit tests for OAuthStateManager:
  - `generateState()` produces correct format
  - `validateState()` accepts valid state
  - `validateState()` rejects tampered signature
  - `validateState()` rejects expired state (timestamp > 10 min)
  - `validateState()` rejects missing cookie state

- [x] 4.2 Write integration tests for OAuthLoginUseCase:
  - Happy path with valid signed state
  - Error path with invalid signature
  - Error path with expired state
  - Error path with missing cookie

- [x] 4.3 Write integration test for OAuthController:
  - `initiate()` sets oauth_state cookie with correct attributes
  - Cookie is HTTP-only and has correct maxAge

## Phase 5: Cleanup / Verification

- [x] 5.1 Run `bun run lint` in Identity service to verify no errors

- [x] 5.2 Verify environment variable OAUTH_STATE_SECRET is documented in .env.example

- [x] 5.3 Update JSDoc comments in OAuthLoginUseCase to document new validation behavior
