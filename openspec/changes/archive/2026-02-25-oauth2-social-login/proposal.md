# Proposal: OAuth2/Social Login

## Intent

Add OAuth2 social login support (Google, GitHub) to the Identity service to improve user onboarding experience. Users should be able to register and login using their existing Google or GitHub accounts instead of email/password.

## Scope

### In Scope
- Google OAuth2 provider integration
- GitHub OAuth2 provider integration
- New endpoint: `POST /auth/oauth/google`
- New endpoint: `POST /auth/oauth/github`
- OAuth user linking to existing accounts (same email)
- New database table for OAuth providers
- Callback handling for OAuth flow

### Out of Scope
- Facebook/Twitter/Apple OAuth (future enhancement)
- OAuth token refresh beyond what provider offers
- Frontend OAuth UI components (backend only)
- Multi-factor authentication via OAuth

## Approach

1. **OAuth Strategy Pattern**: Extend existing registration strategies to support OAuth providers
2. **Passport.js Integration**: Use passport.js with google-oauth20 and github2 strategies
3. **Database Schema**: Add `user_oauth_providers` table to link OAuth accounts to users
4. **Token Generation**: Reuse existing JWT generation for authenticated OAuth users
5. **Security**: Validate state parameter to prevent CSRF, verify provider tokens

### Technical Flow (Google Example)
1. User clicks "Login with Google" on frontend
2. Frontend redirects to Google OAuth consent screen
3. Google redirects back with auth code
4. Backend exchanges code for tokens
5. Backend retrieves user profile from Google
6. Backend creates/links user in database
7. Backend generates JWT and returns to user

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/domain/entities/` | Modified | Add OAuthUser entity or extend User |
| `Identity/src/domain/errors/` | Modified | Add OAuthError classes |
| `Identity/src/application/ports/` | Modified | Add IOAuthService interface |
| `Identity/src/application/use-case/` | New | Create OAuthUseCase classes |
| `Identity/src/infrastructure/http/routes/` | Modified | Add OAuth routes |
| `Identity/src/infrastructure/http/controllers/` | New | OAuthController |
| `Identity/src/infrastructure/services/` | New | OAuth providers services |
| `Identity/src/infrastructure/database/drizzle/schema.ts` | Modified | Add user_oauth_providers table |
| `Identity/src/infrastructure/DI/container.ts` | Modified | Register new dependencies |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OAuth provider downtime | Medium | Graceful fallback to email/password |
| Token leakage | Low | Use HTTP-only cookies, short-lived tokens |
| New user vs existing user confusion | Medium | Link accounts by verified email |
| Rate limiting by provider | Low | Implement exponential backoff |

## Roll. Revert changesback Plan

1 to `schema.ts` (remove user_oauth_providers table)
2. Remove OAuth routes from `auth.routes.ts`
3. Remove OAuthController
4. Remove OAuth strategies and services
5. Rollback database migration
6. Run `bun run lint:fix` to ensure no lingering code

## Dependencies

- Google Cloud Console project with OAuth credentials
- GitHub OAuth App credentials
- Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Install: `passport`, `passport-google-oauth20`, `passport-github2`

## Success Criteria

- [ ] User can register/login with Google account
- [ ] User can register/login with GitHub account
- [ ] Existing email/password users can link OAuth provider
- [ ] OAuth users can login with same provider multiple times
- [ ] JWT tokens are generated correctly for OAuth users
- [ ] Linting passes: `bun run lint`
- [ ] No security vulnerabilities in OAuth flow (state validation, token handling)
