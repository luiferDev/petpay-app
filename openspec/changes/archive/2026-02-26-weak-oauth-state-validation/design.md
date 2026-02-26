# Design: Fix Weak OAuth State Validation

## Technical Approach

Implement cryptographically signed OAuth state using HMAC-SHA256 with encrypted cookie storage. The state format will be `{timestamp}:{randomBytes}:{signature}` where signature is HMAC-signed with `OAUTH_STATE_SECRET`.

## Architecture Decisions

### Decision: State Format

**Choice**: `{timestamp}:{randomBytes}:{signature}`
**Alternatives considered**: 
- JWT tokens (overhead for simple state)
- UUID only (no protection against attacker-generated state)
**Rationale**: Minimal format that includes timestamp for expiration and HMAC for integrity

### Decision: Cookie Storage for State

**Choice**: Encrypted HTTP-only cookie named `oauth_state`
**Alternatives considered**:
- Session storage (requires session infrastructure)
- LocalStorage + validation only (vulnerable to XSS)
**Rationale**: Cookie is automatically sent with callback, HttpOnly prevents XSS access, encryption protects against tampering

### Decision: HMAC-SHA256 for Signing

**Choice**: HMAC-SHA256 over asymmetric signatures
**Alternatives considered**:
- RSA signatures (overhead, not needed for stateless verification)
- AES encryption (doesn't provide integrity verification)
**Rationale**: HMAC-SHA256 is fast, provides integrity, and symmetric secret is sufficient for this use case

### Decision: 10-Minute Expiration Window

**Choice**: 10 minutes (600000ms) with 1-minute clock skew tolerance
**Alternatives considered**:
- 5 minutes (too aggressive for slow OAuth flows)
- 30 minutes (too long, increases attack window)
**Rationale**: Standard OAuth timeout, allows for user interaction delays

## Data Flow

```
User clicks "Login with Google"
        │
        ▼
OAuthController.initiate()
        │
        ▼
OAuthStateManager.generateState() ──→ Creates {timestamp}:{random}:{signature}
        │
        ▼
res.cookie('oauth_state', signedState, { httpOnly, secure, maxAge: 600 })
        │
        ▼
res.redirect(`https://provider?state={signedState}`)
        │
        ▼
User returns to callback with ?code=xxx&state={signedState}
        │
        ▼
OAuthLoginUseCase.execute() validates:
  1. State exists in cookie and query param
  2. Parse timestamp:random:signature
  3. Verify HMAC signature
  4. Verify timestamp within 10 minutes
        │
        ▼
Clear oauth_state cookie
        │
        ▼
Proceed with token exchange
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/services/OAuthStateManager.ts` | Create | Utility class for state generation and validation |
| `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts` | Modify | Replace length check with HMAC validation |
| `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts` | Modify | Apply same validation fix |
| `Identity/src/infrastructure/http/controllers/OAuthController.ts` | Modify | Set encrypted cookie on initiate, read cookie on callback |
| `Identity/src/infrastructure/config/env.ts` | Modify | Make OAUTH_STATE_SECRET required when OAuth enabled |

## Interfaces / Contracts

### OAuthStateManager.ts

```typescript
export interface StatePayload {
  timestamp: number
  random: string
  signature: string
}

export class OAuthStateManager {
  constructor(private readonly secret: string) {}

  generateState(): string
  
  validateState(state: string, cookieState: string): StateValidationResult
  
  isExpired(timestamp: number, maxAgeMs: number): boolean
}

export interface StateValidationResult {
  valid: boolean
  error?: 'missing_cookie' | 'invalid_format' | 'invalid_signature' | 'expired'
  message?: string
}
```

### Cookie Requirements

```typescript
const oauthStateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 600000, // 10 minutes
  path: '/auth/oauth'
}
```

### Environment Variable

```typescript
// In env.ts, change OAUTH_STATE_SECRET from optional to required
OAUTH_STATE_SECRET: z.string().min(32, 'OAUTH_STATE_SECRET must be at least 32 characters'),
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | OAuthStateManager.generateState() | Verify format, randomness, signature |
| Unit | OAuthStateManager.validateState() | Test valid, tampered, expired, missing cookie |
| Unit | OAuthLoginUseCase with signed state | Integration test with mock OAuth provider |
| Integration | OAuthController.initiate sets cookie | Verify cookie attributes |
| Integration | OAuth flow end-to-end | Full OAuth login with Google/GitHub |

## Migration / Rollback

**Migration**:
1. Deploy new OAuthStateManager and updated use cases
2. OAUTH_STATE_SECRET becomes required (add to env for existing deployments)
3. No database changes required - stateless validation

**Rollback Plan**:
1. Revert OAuthLoginUseCase.ts line 64 to `state.length >= 16`
2. Remove cookie setting in OAuthController.initiate
3. Deploy within 5 minutes

## Open Questions

- [ ] Should we add a feature flag to enable new validation gradually?
- [ ] Do we need to support legacy state format during migration period?
