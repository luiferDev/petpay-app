# Design: OAuth2/Social Login

## Technical Approach

Implement OAuth2 social login using **Passport.js** as the authentication framework. The implementation follows the existing Clean Architecture patterns in the Identity service, extending the current registration and authentication flows to support Google and GitHub OAuth providers.

The design leverages the existing JWT infrastructure for token generation after OAuth authentication, ensuring consistency with the current auth system.

## Architecture Decisions

### Decision: Passport.js for OAuth

**Choice**: Use Passport.js with `passport-google-oauth20` and `passport-github2` strategies

**Alternatives considered**:
- Manual OAuth implementation (building OAuth flow from scratch)
- Using Auth.js/NextAuth (designed for Next.js, not Express)
- Using Firebase Auth (adds external dependency, less control)

**Rationale**: Passport.js is the standard for Express.js, provides well-tested strategies, and integrates cleanly with the existing middleware pattern.

### Decision: State Parameter for CSRF Protection

**Choice**: Generate cryptographic state parameter stored in encrypted cookie

**Alternatives considered**:
- Session-based state (adds session overhead)
- URL-encoded state in redirect (less secure)

**Rationale**: Encrypted cookie provides secure state storage without server-side session management. The state is validated on callback to prevent CSRF attacks.

### Decision: OAuth Provider Table Schema

**Choice**: Separate `user_oauth_providers` table with encrypted tokens

**Alternatives considered**:
- Extending users table with provider fields (violates single responsibility)
- JSON column in users table (harder to query, less type-safe)

**Rationale**: Separate table allows multiple providers per user, cleaner schema, and easier token management per provider.

### Decision: Link Existing Accounts by Email

**Choice**: Link OAuth accounts to existing users when email matches and is verified

**Alternatives considered**:
- Always create new user per provider (confusing UX)
- Require explicit linking (more friction)

**Rationale**: Most users expect their Google/GitHub account to work with their existing Petpay account if they use the same email. Verified email from OAuth provider serves as trust anchor.

## Data Flow

### OAuth Initiation Flow

```
Frontend                    Identity Service              OAuth Provider
    │                             │                            │
    │  GET /auth/oauth/:provider  │                            │
    │  /initiate                 │                            │
    │ ─────────────────────────> │                            │
    │                             │                            │
    │   Generate state, create    │                            │
    │   encrypted cookie         │                            │
    │ ─────────────────────────> │                            │
    │                             │                            │
    │  Redirect to provider       │                            │
    │  with client_id, state,    │                            │
    │  redirect_uri              │                            │
    │ ─────────────────────────────────────────────────────> │
```

### OAuth Callback Flow

```
OAuth Provider              Identity Service              Database
    │                             │                            │
    │  Redirect with code, state  │                            │
    │  to /auth/oauth/callback    │                            │
    │ ─────────────────────────> │                            │
    │                             │                            │
    │  Validate state from cookie │                            │
    │ ─────────────────────────> │                            │
    │                             │                            │
    │  Exchange code for tokens   │                            │
    │  with provider             │                            │
    │ ─────────────────────────────────────────────────────> │
    │                             │                            │
    │  Get user profile from      │                            │
    │  provider                  │                            │
    │ ─────────────────────────────────────────────────────> │
    │                             │                            │
    │  Find or create user by     │                            │
    │  provider + email           │                            │
    │                             │ ───────────────────────> │
    │                             │                            │
    │  Generate JWT tokens         │                            │
    │ ─────────────────────────> │                            │
    │                             │                            │
    │  Set HTTP-only cookie       │                            │
    │  with JWT + redirect        │                            │
    │ ─────────────────────────> │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/domain/entities/OAuthUser.ts` | Create | OAuth user entity |
| `Identity/src/domain/errors/OAuthError.ts` | Create | OAuth-specific errors |
| `Identity/src/application/ports/IOAuthProvider.ts` | Create | OAuth provider interface |
| `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts` | Create | OAuth authentication use case |
| `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts` | Create | Link provider to existing user |
| `Identity/src/infrastructure/services/OAuthProviders.ts` | Create | Passport strategies and configuration |
| `Identity/src/infrastructure/services/GoogleOAuthStrategy.ts` | Create | Google OAuth strategy |
| `Identity/src/infrastructure/services/GitHubOAuthStrategy.ts` | Create | GitHub OAuth strategy |
| `Identity/src/infrastructure/http/controllers/OAuthController.ts` | Create | OAuth HTTP handlers |
| `Identity/src/infrastructure/http/routes/oauth.routes.ts` | Create | OAuth route definitions |
| `Identity/src/infrastructure/http/middlewares/oauth-validators.ts` | Create | OAuth validation middleware |
| `Identity/src/infrastructure/database/drizzle/schema.ts` | Modify | Add user_oauth_providers table |
| `Identity/src/infrastructure/database/repositories/OAuthUserRepository.ts` | Create | OAuth provider data access |
| `Identity/src/infrastructure/DI/InjectionTokens.ts` | Modify | Add OAuth tokens |
| `Identity/src/infrastructure/DI/container.ts` | Modify | Register OAuth dependencies |
| `Identity/src/infrastructure/config/env.ts` | Modify | Add OAuth env vars |

## Interfaces / Contracts

### IOAuthProvider Interface

```typescript
// Identity/src/application/ports/IOAuthProvider.ts
export interface OAuthUserProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface IOAuthProvider {
  readonly providerName: 'google' | 'github';
  
  getAuthorizationUrl(state: string): string;
  
  exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;
  
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}
```

### OAuthUserRepository Interface

```typescript
// Identity/src/application/ports/IOAuthUserRepository.ts
export interface OAuthUserRepository {
  findByProviderAndId(provider: string, providerUserId: string): Promise<OAuthUserRecord | null>;
  findByUserIdAndProvider(userId: string, provider: string): Promise<OAuthUserRecord | null>;
  create(record: CreateOAuthUserRecord): Promise<OAuthUserRecord>;
  updateTokens(id: string, tokens: UpdateOAuthTokens): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
```

### Environment Variables

```typescript
// Required env vars for OAuth
interface OAuthEnv {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string; // e.g., /auth/oauth/google/callback
  
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_CALLBACK_URL: string;
  
  // Security
  OAUTH_STATE_SECRET: string; // For encrypting state cookie
}
```

### Database Schema (user_oauth_providers)

```typescript
// New table to add to schema.ts
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'github']);

export const userOAuthProviders = pgTable('user_oauth_providers', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessToken: text('access_token'), // Should be encrypted
  refreshToken: text('refresh_token'), // Should be encrypted
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userProviderUnique: unique('user_provider_unique').on(table.userId, table.provider),
  providerUserUnique: unique('oauth_provider_user_unique').on(table.provider, table.providerUserId)
}));

export const userOAuthProviderRelations = relations(userOAuthProviders, ({ one }) => ({
  user: one(users, {
    fields: [userOAuthProviders.userId],
    references: [users.id]
  })
}));
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | OAuthUseCase logic | Mock IOAuthProvider, test user creation/linking logic |
| Unit | OAuth error handling | Test various provider errors |
| Integration | OAuth flow end-to-end | Mock provider responses, test full flow |
| Integration | Account linking | Test linking existing user with new provider |

### Test Scenarios to Implement

1. **New user Google login** → Creates user, returns JWT
2. **Existing user Google login** → Finds user, returns JWT
3. **Link Google to existing user** → Adds provider, returns success
4. **Invalid state parameter** → Returns 400 error
5. **Provider token exchange failure** → Returns 401 error
6. **User deletion cascades to OAuth providers** → Verifies cascade delete

## Migration / Rollout

### Database Migration

Run Drizzle migration to create `user_oauth_providers` table:

```bash
bunx drizzle-kit generate
bunx drizzle-kit push
```

### Feature Flag

Consider adding an environment variable `ENABLE_OAUTH` to toggle the feature before full rollout:

```typescript
// In OAuthController
if (!process.env.ENABLE_OAUTH) {
  return res.status(503).json({ error: 'OAuth temporarily unavailable' });
}
```

### Rollback Plan

1. Remove `user_oauth_providers` table (migration rollback)
2. Delete OAuth route files
3. Remove OAuth strategies and services
4. Remove OAuth env vars from configuration
5. Run `bun run lint:fix`

## Open Questions

- [ ] Should OAuth tokens be encrypted at rest or only in transit?
- [ ] Should we support OAuth token refresh proactively?
- [ ] Should we log OAuth provider errors to external monitoring?
- [ ] Should we add rate limiting specifically for OAuth endpoints?

## Dependencies to Install

```bash
cd Identity
bun add passport passport-google-oauth20 passport-github2
bun add -d @types/passport @types/passport-google-oauth20 @types/passport-github2
```
