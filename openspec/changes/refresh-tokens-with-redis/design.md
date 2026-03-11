# Design: JWT Refresh Tokens with Redis Storage

## Technical Approach

The implementation adds Redis-based refresh token tracking to enable token rotation and revocation. The approach uses:
- Redis for storing active refresh tokens with TTL
- Token rotation (invalidate old, issue new) to prevent replay attacks
- Unique tokenId (UUID) in JWT payload for Redis key management
- Token validation checks both JWT signature AND Redis existence

## Architecture Decisions

### Decision: Redis Key Format

**Choice**: `refresh_token:{userId}:{tokenId}`
**Alternatives considered**:
- `{tokenId}` only - rejected because harder to manage per-user token listing
- `{refreshTokenHash}` - rejected, harder to correlate with user
**Rationale**: Enables easy invalidation by user ID and token ID, supports session tracking

### Decision: Token Rotation Strategy

**Choice**: Invalidate old token before issuing new one (pre-rotation)
**Alternatives considered**:
- Post-rotation (issue new, then invalidate old) - could allow brief reuse window
- No rotation - rejected per proposal requirements
**Rationale**: Pre-rotation ensures the old token cannot be reused even during the brief window of token generation

### Decision: Redis Connection Fallback

**Choice**: Fail gracefully - log warning and continue startup, allow stateless fallback
**Alternatives considered**:
- Hard fail - rejected, would block service startup
- Required Redis - rejected, too restrictive for development
**Rationale**: Allows service to start and operate in degraded mode (stateless) if Redis is unavailable

### Decision: Token ID in JWT Payload

**Choice**: Include tokenId in refresh token payload (not access token)
**Alternatives considered**:
- Token ID in both - unnecessary overhead for access tokens
- Token ID as JWT ID (jti) claim - good, use this
**Rationale**: Follows JWT standard with jti claim, only needed in refresh token for rotation tracking

### Decision: Redis Client Library

**Choice**: `ioredis` with connection pooling
**Alternatives considered**:
- `node-redis` - less TypeScript support, fewer features
- Redis in-memory mock - only for testing
**Rationale**: Better TypeScript support, connection pooling built-in, widely used

## Data Flow

### Token Refresh Flow

```
Client Request (expired access + valid refresh)
        │
        ▼
┌───────────────────┐
│ AuthController    │ ─── receives refresh request
│ .refresh()        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ RefreshTokenUseCase│
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌────────────────┐
│JwtToken │ │ IRedisService  │
│Provider │ │ .get()         │
└────┬────┘ └────┬───────────┘
     │           │
     ▼           ▼
Verify JWT   Check Redis
Signature    for Token
     │           │
     └─────┬─────┘
           │
           ▼
      ┌────────┐
      │Token OK│
      └────┬───┘
           │
           ▼
┌───────────────────┐
│ IRedisService     │
│ .delete(oldToken) │ ─── Invalidate old
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ JwtTokenProvider  │ ─── Generate new tokens
│ .generateTokens() │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ IRedisService     │
│ .set(newToken,TTL)│ ─── Store new token
└────────┬──────────┘
         │
         ▼
    Return new tokens
        │
        ▼
   Client receives
   new access + refresh
```

### Logout Flow

```
Client Request (refresh token)
        │
        ▼
┌───────────────────┐
│ AuthController    │ ─── receives logout request
│ .logout()         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ LogoutUseCase     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ IRedisService     │
│ .delete(tokenKey) │ ─── Remove from Redis
└────────┬──────────┘
         │
         ▼
    Return success
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/config/env.ts` | Modify | Add Redis config (REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB) |
| `Identity/src/application/ports/IRedisService.ts` | Create | Interface for Redis operations (get, set, delete) |
| `Identity/src/infrastructure/services/RedisService.ts` | Create | Redis client wrapper implementing IRedisService |
| `Identity/src/application/ports/ITokenService.ts` | Modify | Add generateTokenPair with tokenId method, refresh token methods |
| `Identity/src/infrastructure/services/JwtTokenProvider.ts` | Modify | Add tokenId generation, update generateTokens to include jti |
| `Identity/src/application/use-case/auth/RefreshTokenUseCase.ts` | Create | Token refresh business logic with rotation |
| `Identity/src/application/use-case/auth/LogoutUseCase.ts` | Create | Logout business logic (invalidate token) |
| `Identity/src/infrastructure/http/controllers/auth-controller.ts` | Modify | Add refresh() and logout() handlers |
| `Identity/src/infrastructure/http/routes/auth.routes.ts` | Modify | Add /refresh and /logout routes |
| `Identity/src/infrastructure/http/validation/zod-schemas/refresh-schema.ts` | Create | Zod schema for refresh request validation |
| `Identity/src/infrastructure/DI/container.ts` | Modify | Register RedisService and use cases |
| `Identity/src/infrastructure/DI/InjectionTokens.ts` | Modify | Add REDIS_SERVICE token |

## Interfaces / Contracts

### IRedisService

```typescript
export interface IRedisService {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
  isConnected(): boolean
}
```

### ITokenService Extension

```typescript
abstract class ITokenService {
  // Existing methods...
  
  abstract generateTokensWithTokenId(user: User): {
    accessToken: string
    refreshToken: string
    tokenId: string
  }
  
  abstract verifyRefreshToken(token: string): {
    id: number
    email: string
    role: Role
    tokenId: string
  }
}
```

### RefreshTokenRequest DTO

```typescript
export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}
```

### LogoutRequest DTO

```typescript
export interface LogoutRequest {
  refreshToken: string
}

export interface LogoutResponse {
  message: string
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | IRedisService methods | Mock Redis client, test get/set/delete |
| Unit | RefreshTokenUseCase | Mock ITokenService, IRedisService |
| Unit | LogoutUseCase | Mock IRedisService |
| Unit | JwtTokenProvider with tokenId | Test token generation includes jti |
| Integration | POST /auth/refresh | Full request/response test |
| Integration | POST /auth/logout | Full request/response test |
| Integration | Token rotation | Verify old token invalidated, new token works |
| Integration | Used token rejection | Verify reused token is rejected |

## Migration / Rollout

No database migration required. Redis storage is ephemeral (TTL-based).

Phased rollout:
1. Deploy with Redis config optional (backward compatible)
2. Enable Redis in staging, test refresh/logout flows
3. Enable in production
4. Monitor Redis connection health

Feature flag approach: Can use REDIS_URL presence as implicit feature flag.

## Open Questions

- [ ] Should we add a "refresh token family" concept to support token reuse detection (blocklisting)?
- [ ] Should we store refresh token metadata (device info, IP) in Redis for session listing?
- [ ] Should the logout endpoint accept access token instead of refresh token for easier mobile implementation?