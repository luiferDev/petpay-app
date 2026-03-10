# Tasks: Add Rate Limiter for All Endpoints

## Phase 1: Foundation / Configuration

- [x] 1.1 Install express-rate-limit: `cd Identity && bun add express-rate-limit`
- [x] 1.2 Add rate limiting environment variables to `Identity/src/infrastructure/config/env.ts`
- [x] 1.3 Add helper functions to check if rate limiting is enabled

## Phase 2: Core Implementation - Middleware

- [x] 2.1 Create `Identity/src/infrastructure/http/middlewares/rate-limiter.ts` with:
  - createRateLimiter factory function
  - Pre-configured authRateLimiter (10 requests / 15 min)
  - Pre-configured oauthRateLimiter (5 requests / 15 min)
  - Pre-configured generalRateLimiter (100 requests / 1 min)

## Phase 3: Integration

- [x] 3.1 Update `Identity/src/infrastructure/http/server.ts` to apply rate limiters:
  - Apply authRateLimiter to `/auth` routes
  - Apply oauthRateLimiter to `/auth/oauth` routes
  - Apply generalRateLimiter to other routes

## Phase 4: Verification

- [x] 4.1 Run linter: `cd Identity && bun run lint` - No new errors
- [x] 4.2 Test rate limiting manually by making requests
- [x] 4.3 Verify rate limit headers are present in responses
- [x] 4.4 Test 429 response when limit is exceeded
