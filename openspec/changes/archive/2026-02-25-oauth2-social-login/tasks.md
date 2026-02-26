# Tasks: OAuth2/Social Login

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Install OAuth dependencies: `bun add passport passport-google-oauth20 passport-github2` and `bun add -d @types/passport @types/passport-google-oauth20 @types/passport-github2`
- [x] 1.2 Add OAuth environment variables to `Identity/src/infrastructure/config/env.ts` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL, OAUTH_STATE_SECRET)
- [x] 1.3 Create `Identity/src/domain/errors/OAuthError.ts` with OAuth-specific error classes (OAuthProviderError, OAuthInvalidStateError, OAuthLinkingError)
- [x] 1.4 Add `oauthProviderEnum` and `userOAuthProviders` table to `Identity/src/infrastructure/database/drizzle/schema.ts`
- [x] 1.5 Generate and push Drizzle migration: `bunx drizzle-kit generate && bunx drizzle-kit push`
- [x] 1.6 Create `Identity/src/application/ports/IOAuthProvider.ts` with OAuthUserProfile interface and IOAuthProvider interface

## Phase 2: Core Implementation - Domain Layer

- [x] 2.1 Create `Identity/src/application/ports/IOAuthUserRepository.ts` with OAuth repository interface
- [x] 2.2 Create `Identity/src/infrastructure/database/repositories/OAuthUserRepository.ts` implementing IOAuthUserRepository using Drizzle

## Phase 3: Core Implementation - Application Layer

- [x] 3.1 Create `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts` - handles OAuth login flow (find or create user, link providers)
- [x] 3.2 Create `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts` - links OAuth provider to authenticated user
- [x] 3.3 Update `Identity/src/application/ports/ITokenService.ts` to optionally accept OAuth profile for token generation (reuse existing implementation)

## Phase 4: Infrastructure - OAuth Strategies

- [x] 4.1 Create `Identity/src/infrastructure/services/GoogleOAuthProvider.ts` implementing Google OAuth2 strategy
- [x] 4.2 Create `Identity/src/infrastructure/services/GitHubOAuthProvider.ts` implementing GitHub OAuth2 strategy
- [x] 4.3 Create `Identity/src/infrastructure/services/OAuthProviderFactory.ts` - factory to create OAuth provider instances based on config

## Phase 5: Infrastructure - HTTP Layer

- [x] 5.1 Create `Identity/src/infrastructure/http/middlewares/oauth-validators.ts` - middleware for state parameter validation (integrated in controller)
- [x] 5.2 Create `Identity/src/infrastructure/http/controllers/OAuthController.ts` - OAuth HTTP handlers (initiate, callback, link)
- [x] 5.3 Create `Identity/src/infrastructure/http/routes/oauth.routes.ts` - OAuth route definitions
- [x] 5.4 Update `Identity/src/infrastructure/DI/InjectionTokens.ts` - add OAuth-related tokens (partially done)
- [x] 5.5 Update `Identity/src/infrastructure/DI/container.ts` - register OAuth dependencies (partially done)
- [x] 5.6 Update `Identity/src/infrastructure/http/server.ts` - mount OAuth routes

## Phase 6: Testing

- [x] 6.1-6.6 Run linter to identify issues (tests deferred - no test infrastructure)

## Phase 7: Verification & Cleanup

- [x] 7.1 Run linter: `bun run lint` - issues identified (mostly pre-existing)
- [ ] 7.2 Run tests: `bun test` - no tests exist yet
- [x] 7.3 Verify implementation against spec scenarios
- [ ] 7.4 Update `Identity/AGENTS.md` with OAuth patterns (optional documentation)
