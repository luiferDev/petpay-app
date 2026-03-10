# Proposal: Add Rate Limiter for All Endpoints

## Intent

Implement rate limiting middleware to protect all API endpoints from abuse, brute-force attacks, and excessive requests. This addresses the security gap identified in the OAuth implementation and protects the entire Identity service from DoS attacks.

## Scope

### In Scope
- Install rate limiting library (express-rate-limit)
- Create rate limiter middleware for all endpoints
- Configure different limits for different endpoint categories:
  - Auth endpoints (login, register): stricter limits
  - OAuth endpoints: stricter limits
  - General API endpoints: standard limits
- Add rate limit headers to responses
- Store rate limit data in memory (for now)

### Out of Scope
- Redis/distributed rate limiting (future enhancement)
- Rate limiting for Go services (Marketplace, Catalog)
- Custom rate limiting per user/plan (future enhancement)
- IP whitelist/blacklist (future enhancement)

## Approach

Use `express-rate-limit` library which is the standard for Express.js applications:
1. Install express-rate-limit
2. Create a reusable rate limiter middleware
3. Apply different configurations per endpoint type
4. Return standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

### Configuration
- Auth endpoints: 10 requests per 15 minutes
- OAuth endpoints: 5 requests per 15 minutes  
- General endpoints: 100 requests per minute

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/package.json` | Modified | Add express-rate-limit dependency |
| `Identity/src/infrastructure/http/middlewares/` | New | Create rate-limiter.middleware.ts |
| `Identity/src/infrastructure/http/server.ts` | Modified | Apply rate limiter to all routes |
| `Identity/src/infrastructure/config/env.ts` | Modified | Add rate limiting config options |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| False positives blocking legitimate users | Medium | Use generous limits, allow config tuning |
| Performance impact | Low | In-memory store is fast |
| Deployment issues | Low | Can be disabled via env var |

## Rollback Plan

1. Remove express-rate-limit from package.json
2. Remove rate limiter middleware file
3. Remove rate limiter import from server.ts
4. Remove rate limit env vars
5. Run `bun run lint:fix`

## Dependencies

- `express-rate-limit` - Rate limiting middleware
- Environment variables: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_OAUTH_WINDOW_MS`, `RATE_LIMIT_OAUTH_MAX`, `RATE_LIMIT_GENERAL_WINDOW_MS`, `RATE_LIMIT_GENERAL_MAX`

## Success Criteria

- [ ] All endpoints protected by rate limiting
- [ ] Different limits applied to auth vs general endpoints
- [ ] Rate limit headers included in responses
- [ ] Configuration adjustable via environment variables
- [ ] Linting passes: `bun run lint`
- [ ] No impact on legitimate user traffic
