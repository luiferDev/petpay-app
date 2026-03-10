# Design: Add Rate Limiter for All Endpoints

## Technical Approach

Implement rate limiting using `express-rate-limit` middleware for the Express.js Identity service. The implementation will create reusable middleware that can be applied to different route groups with specific limits.

## Architecture Decisions

### Decision: Use express-rate-limit

**Choice**: Use `express-rate-limit` library

**Alternatives considered**:
- Building custom rate limiting from scratch (reinventing the wheel)
- Using `express-brute` (outdated, less maintained)
- Using Redis-based solutions (overkill for single instance)

**Rationale**: `express-rate-limit` is the standard, well-maintained library for Express.js rate limiting. It supports custom stores, all standard features, and is easy to configure.

### Decision: In-Memory Store

**Choice**: Use default in-memory store for rate limit counters

**Alternatives considered**:
- Redis store (requires external dependency)
- MongoDB store (requires external dependency)
- Custom in-memory solution

**Rationale**: Simplest for initial implementation. Works well for single-instance deployments. Can be extended to Redis later if needed.

### Decision: Apply Rate Limiter per Route Group

**Choice**: Apply different rate limiters to different route groups (auth, oauth, general)

**Alternatives considered**:
- Single global rate limiter (too coarse)
- Per-endpoint rate limiting (too granular, hard to maintain)

**Rationale**: Provides flexibility to have stricter limits for sensitive endpoints (auth, oauth) while allowing reasonable limits for general API usage.

## Data Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│  Rate Limiter   │ ─── Within limits? ──── Yes ────→ Process Request
│  Middleware     │              │
└─────────────────┘              No
      │                           │
      ▼                           ▼
Return 429              Return HTTP 429
Too Many Requests      + Retry-After header
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/package.json` | Modified | Add express-rate-limit dependency |
| `Identity/src/infrastructure/config/env.ts` | Modified | Add rate limiting env vars |
| `Identity/src/infrastructure/http/middlewares/rate-limiter.ts` | Created | Rate limiter middleware factory |
| `Identity/src/infrastructure/http/server.ts` | Modified | Apply rate limiters to routes |

## Configuration

### Environment Variables

```typescript
interface RateLimitConfig {
  RATE_LIMIT_ENABLED: boolean
  RATE_LIMIT_AUTH_MAX: number        // default: 10
  RATE_LIMIT_AUTH_WINDOW_MS: number  // default: 900000 (15 min)
  RATE_LIMIT_OAUTH_MAX: number       // default: 5
  RATE_LIMIT_OAUTH_WINDOW_MS: number // default: 900000 (15 min)
  RATE_LIMIT_GENERAL_MAX: number     // default: 100
  RATE_LIMIT_GENERAL_WINDOW_MS: number // default: 60000 (1 min)
}
```

### Middleware Interface

```typescript
// Identity/src/infrastructure/http/middlewares/rate-limiter.ts
import rateLimit from 'express-rate-limit'

interface RateLimiterOptions {
  windowMs: number
  max: number
  message?: string
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

/**
 * Creates a rate limiter middleware with the given options.
 * @param {RateLimiterOptions} options - Configuration for the rate limiter
 * @returns {RateLimitRequestHandler} Express rate limit middleware
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message ?? 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip ?? req.socket.remoteAddress ?? 'unknown'
    }
  })
}

// Pre-configured limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10
})

export const oauthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5
})

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100
})
```

## Server Integration

```typescript
// Identity/src/infrastructure/http/server.ts
import authRateLimiter from './middlewares/rate-limiter'

// Apply rate limiters to routes
app.use('/auth', authRateLimiter, authRouter)
app.use('/auth/oauth', authRateLimiter, oauthRouter)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Rate limiter configuration | Test different configs |
| Integration | Rate limit headers | Make requests, verify headers |
| Integration | 429 response | Exceed limit, verify error |

## Migration / Rollout

No migration required. This is a new middleware that doesn't affect existing data or schema.

## Open Questions

- [ ] Should we add rate limiting to the root `/` endpoint?
- [ ] Should rate limit be disabled in development mode?

## Dependencies to Install

```bash
cd Identity
bun add express-rate-limit
```
