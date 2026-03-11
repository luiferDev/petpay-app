# Proposal: JWT Refresh Tokens with Redis Storage

## Intent

Implement secure JWT refresh token functionality with Redis storage to enable token rotation, revocation, and extended session management. Currently, refresh tokens are generated as stateless JWTs with no way to invalidate them, creating a security risk. This change addresses the need for:
- **Security**: Ability to revoke tokens on logout or suspicious activity
- **Token Rotation**: Generate new refresh tokens on each use to prevent token replay attacks
- **Session Management**: Track active sessions per user
- **Compliance**: Support for token expiration and refresh workflows required by mobile apps

## Scope

### In Scope
- Add Redis connection and configuration
- Create `IRedisService` interface and `RedisService` implementation
- Extend `ITokenService` interface with refresh token management methods
- Implement `RefreshTokenUseCase` for token refresh logic
- Add `POST /auth/refresh` endpoint
- Add `POST /auth/logout` endpoint
- Implement token rotation (invalidate old refresh token, issue new one)
- Store refresh tokens in Redis with configurable TTL
- Add integration tests

### Out of Scope
- Refresh token fingerprinting/device tracking
- Rate limiting on refresh endpoint (existing generic rate limiting applies)
- Token reuse detection/blocklisting (future enhancement)
- Multi-device session management UI

## Approach

1. **Redis Integration**:
   - Add Redis connection using `ioredis` library
   - Store refresh tokens as Redis keys: `refresh_token:{userId}:{tokenId}`
   - TTL set to match `REFRESH_TOKEN_EXPIRY` config

2. **Token Rotation Flow**:
   - Client sends expired access token + valid refresh token
   - Server validates refresh token signature
   - Server checks if refresh token exists in Redis
   - Server invalidates old refresh token (deletes from Redis)
   - Server generates new access + refresh token pair
   - New refresh token stored in Redis with new TTL

3. **Logout Flow**:
   - Client sends refresh token
   - Server deletes refresh token from Redis
   - Return success response

4. **Key Design Decisions**:
   - Use Redis SET with NX option for atomic token storage
   - Include unique token ID (UUID) in JWT payload for tracking
   - Keep JWT verification on each request for performance
   - Redis acts as source of truth for token validity

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/config/env.ts` | Modified | Add Redis config (REDIS_URL, REDIS_HOST, REDIS_PORT) |
| `Identity/src/infrastructure/services/RedisService.ts` | New | Redis client wrapper with typed methods |
| `Identity/src/application/ports/IRedisService.ts` | New | Interface for Redis operations |
| `Identity/src/application/ports/ITokenService.ts` | Modified | Add refresh token methods |
| `Identity/src/infrastructure/services/JwtTokenProvider.ts` | Modified | Add token ID, refresh token methods |
| `Identity/src/application/use-case/auth/RefreshTokenUseCase.ts` | New | Token refresh business logic |
| `Identity/src/application/use-case/auth/LogoutUseCase.ts` | New | Logout business logic |
| `Identity/src/infrastructure/http/controllers/auth-controller.ts` | Modified | Add refresh and logout handlers |
| `Identity/src/infrastructure/http/routes/auth.routes.ts` | Modified | Add /refresh and /logout routes |
| `Identity/src/infrastructure/DI/container.ts` | Modified | Register Redis service and use cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Redis connection failure causes auth failures | Medium | Implement fallback to in-memory cache or reject requests gracefully |
| Token rotation race conditions | Low | Use Redis atomic operations (SET NX) |
| Redis memory pressure from many tokens | Medium | Set appropriate TTL matching token expiry |
| Performance impact of Redis calls | Low | Add connection pooling, async operations |
| Token not found in Redis (already used) | Low | Return specific error for reuse detection |

## Rollback Plan

1. Remove Redis configuration from `.env`
2. Revert `ITokenService` interface changes
3. Remove Redis service files
4. Remove new endpoints from routes
5. Rollback is safe as refresh tokens can fall back to stateless JWT validation if Redis is unavailable (with warning)

## Dependencies

- Redis server running (local or cloud)
- `ioredis` npm package
- UUID package for token IDs

## Success Criteria

- [ ] POST /auth/refresh returns new access + refresh tokens
- [ ] POST /auth/logout invalidates the refresh token
- [ ] Used refresh tokens cannot be reused
- [ ] Token rotation works correctly (new tokens issued)
- [ ] Redis stores refresh tokens with correct TTL
- [ ] All existing tests pass
- [ ] Linting passes
