# Tasks: JWT Refresh Tokens with Redis Storage

## Phase 1: Infrastructure / Foundation

- [x] 1.1 Add Redis configuration to `Identity/src/infrastructure/config/env.ts` - Add REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB environment variables
- [x] 1.2 Create `Identity/src/application/ports/IRedisService.ts` - Define interface with get, set, delete, isConnected methods
- [x] 1.3 Create `Identity/src/infrastructure/services/RedisService.ts` - Implement IRedisService using ioredis with connection pooling
- [x] 1.4 Add `IRedis_SERVICE` token to `Identity/src/infrastructure/DI/InjectionTokens.ts`

## Phase 2: Token Provider Updates

- [x] 2.1 Modify `Identity/src/infrastructure/services/JwtTokenProvider.ts` - Add tokenId (UUID) generation to generateTokens method
- [x] 2.2 Update JwtTokenProvider to include tokenId (jti claim) in refresh token payload only
- [x] 2.3 Add `generateTokensWithTokenId` method to `Identity/src/application/ports/ITokenService.ts` interface
- [x] 2.4 Implement `verifyRefreshToken` in JwtTokenProvider that extracts tokenId from JWT payload

## Phase 3: Use Cases

- [x] 3.1 Create `Identity/src/application/use-case/auth/RefreshTokenUseCase.ts` - Implement token refresh with Redis validation and rotation (invalidate old, generate new, store new)
- [x] 3.2 Create `Identity/src/application/use-case/auth/LogoutUseCase.ts` - Implement logout that deletes refresh token from Redis

## Phase 4: Controllers / Routes / Validation

- [x] 4.1 Create `Identity/src/infrastructure/http/validation/zod-schemas/refresh-schema.ts` - Zod schema for refresh token request
- [x] 4.2 Create `Identity/src/infrastructure/http/validation/zod-schemas/logout-schema.ts` - Zod schema for logout request
- [x] 4.3 Modify `Identity/src/infrastructure/http/controllers/auth-controller.ts` - Add refresh() and logout() handlers
- [x] 4.4 Modify `Identity/src/infrastructure/http/routes/auth.routes.ts` - Add POST /auth/refresh and POST /auth/logout routes

## Phase 5: Dependency Injection Wiring

- [x] 5.1 Register RedisService in `Identity/src/infrastructure/DI/container.ts`
- [x] 5.2 Register RefreshTokenUseCase and LogoutUseCase in container

## Phase 6: Testing

- [x] 6.1 Write unit tests for RedisService - test get/set/delete with mock ioredis
- [x] 6.2 Write unit tests for RefreshTokenUseCase - mock ITokenService and IRedisService
- [x] 6.3 Write unit tests for LogoutUseCase - mock IRedisService
- [x] 6.4 Write unit tests for JwtTokenProvider - verify tokenId included in refresh token
- [ ] 6.5 Write integration tests for POST /auth/refresh endpoint (manual - ESM module resolution issue)
- [ ] 6.6 Write integration tests for POST /auth/logout endpoint (manual - ESM module resolution issue)
- [ ] 6.7 Write integration test for token rotation - verify old token invalidated, new token works (manual)
- [ ] 6.8 Write integration test for used token rejection - verify reused token returns 401 (manual)

## Phase 7: Cleanup / Polish

- [ ] 7.1 Run `bun run lint` in Identity service and fix any issues
- [ ] 7.2 Update auth routes swagger/OpenAPI documentation if applicable
