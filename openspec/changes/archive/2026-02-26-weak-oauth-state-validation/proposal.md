# Proposal: Fix Weak OAuth State Validation

## Intent

The current OAuth state validation in the Identity service only checks if the state parameter has length >= 16 characters (OAuthLoginUseCase.ts:64). This is insufficient for CSRF protection because an attacker can generate their own random state and trick a victim into completing the OAuth flow. This creates a CSRF vulnerability where an attacker could potentially link their OAuth account to a victim's authenticated session.

## Scope

### In Scope
- Implement cryptographically signed state validation using HMAC
- Add server-side state storage with encrypted cookies
- Update OAuthLoginUseCase to validate signed state
- Update OAuthController to generate and store signed state
- Update LinkOAuthProviderUseCase with the same validation

### Out of Scope
- Full session management system (beyond OAuth state)
- Changes to OAuth callback redirect flow
- Modifications to other Identity authentication flows

## Approach

1. **Signed State with HMAC**: Generate a state that includes a timestamp and sign it with HMAC-SHA256 using a server secret. The format will be `{timestamp}:{randomBytes}:{signature}`

2. **Encrypted Cookie Storage**: Store the generated state in an encrypted HTTP-only cookie alongside the redirect to the OAuth provider. This ensures the state is bound to the user's browser session.

3. **Validation Flow**:
   - On callback, extract state from cookie and query parameter
   - Verify HMAC signature matches
   - Verify timestamp is within acceptable window (e.g., 10 minutes)
   - Clear the cookie after successful validation

4. **Implementation Changes**:
   - Create a new `OAuthStateManager` utility for signing/verifying state
   - Modify `OAuthController.initiate` to set encrypted cookie
   - Modify `OAuthLoginUseCase.execute` to use new validation logic

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts` | Modified | Replace length check with HMAC validation |
| `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts` | Modified | Apply same validation fix |
| `Identity/src/infrastructure/http/controllers/OAuthController.ts` | Modified | Set encrypted cookie on initiate |
| `Identity/src/infrastructure/services/OAuthStateManager.ts` | New | Utility for state signing/verification |
| `Identity/src/infrastructure/config/env.ts` | Modified | Add OAUTH_STATE_SECRET configuration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cookie encryption fails in production | Low | Add error handling, fallback to session storage |
| State validation breaks existing OAuth flows | Medium | Add feature flag, gradual rollout |
| Timestamp validation causes issues with clock skew | Low | Use 10-minute window, allow 1-minute skew |

## Rollback Plan

1. Revert changes to OAuthLoginUseCase.ts and OAuthController.ts
2. Restore the simple length check (`state.length >= 16`)
3. Remove encrypted cookie logic from initiate endpoint
4. Deploy hotfix within 5 minutes

## Dependencies

- Node.js crypto module (built-in)
- cookie-parser or express cookie handling (existing)
- OAUTH_STATE_SECRET environment variable (new)

## Success Criteria

- [ ] OAuth state is cryptographically validated on callback
- [ ] State includes timestamp and expires within 10 minutes
- [ ] State is bound to user's browser via encrypted cookie
- [ ] All OAuth flows (login and account linking) use new validation
- [ ] Unit tests cover state generation, validation, and expiration
