# Design: Fix Linting Errors in Identity Services

## Technical Approach

This design addresses specific linting errors identified in the Identity service's infrastructure layer, focusing on type safety, nullish coalescing, and strict boolean expressions. The approach involves modifying four service files to replace unsafe patterns with explicit, type-safe alternatives while maintaining identical runtime behavior.

The changes are purely refactoring in nature, ensuring compliance with `ts-standard` linting rules without altering business logic or system architecture.

## Architecture Decisions

### Decision: Nullish Coalescing for Optional Fallbacks

**Choice**: Replace logical OR (`||`) with nullish coalescing (`??`) for fallback values in `JwtTokenProvider`.
**Alternatives considered**: Keep `||` and suppress lint warning.
**Rationale**: The `??` operator only falls back for `null` or `undefined`, whereas `||` falls back for all falsy values (`0`, `false`, `""`). Using `??` is more explicit about intent and prevents unintended behavior if a valid falsy value (like `Role.CLIENT = "client"`) is used. The spec requires `??` for `user.roles[0] ?? Role.CLIENT`.

### Decision: Explicit Boolean Checks for Configuration

**Choice**: Replace implicit boolean checks (`!!value`) with explicit comparisons (`value !== undefined && value !== null`) in OAuth providers.
**Alternatives considered**: Use truthiness checks with strict lint rules disabled.
**Rationale**: `ts-standard`'s `strict-boolean-expressions` rule requires explicit checks for non-boolean values. This prevents errors where `0`, `""`, or `NaN` might be treated as falsy when they are valid configuration strings. The spec mandates explicit checks for nullable configuration values.

### Decision: Safe Type Assertions and Guards

**Choice**: Remove unsafe `as any` assertions and redundant type casts in `RabbitMQEventPublisher` and `JwtTokenProvider`.
**Alternatives considered**: Suppress lint warnings for specific lines.
**Rationale**: `as any` bypasses type safety, and `as unknown as amqp.Connection` is redundant if the type is already correct. Using `unknown` for error parameters and proper type narrowing (`instanceof Error`) ensures type safety while maintaining error handling capabilities. For `JwtTokenProvider`, `as SignOptions` casts are removed to allow type inference from the function signature.

## Data Flow

The changes affect initialization and method execution flows within the services:

```
Component               Flow
-----------------      --------------------------------------------------
JwtTokenProvider       User -> GenerateTokens -> Role Fallback (??) -> JWT Sign
GoogleOAuthProvider    Config Check -> Explicit Validation -> Client Init
GitHubOAuthProvider    Config Check -> Explicit Validation -> API Calls
RabbitMQEventPublisher Connection Init -> Type-Safe Channel Mgmt -> Event Publish
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/services/JwtTokenProvider.ts` | Modify | Replace `||` with `??` for role fallback; remove redundant `as SignOptions` casts |
| `Identity/src/infrastructure/services/GoogleOAuthProvider.ts` | Modify | Replace non-null assertions with explicit config validation checks |
| `Identity/src/infrastructure/services/GitHubOAuthProvider.ts` | Modify | Replace non-null assertions with explicit config validation checks |
| `Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts` | Modify | Remove `as any`; fix connection initialization typing (remove `as unknown as`); use `unknown` for errors |

## Interfaces / Contracts

No new interfaces or contracts are introduced. The changes modify internal implementation details while preserving the existing public API of the services.

### Type Definitions

The following type patterns are enforced:

```typescript
// JwtTokenProvider.ts
const payload = {
  id: user.id,
  email: user.email,
  role: user.roles[0] ?? Role.CLIENT // Uses nullish coalescing
};

// GoogleOAuthProvider.ts
// Explicit check instead of non-null assertion
if (!isProviderConfigured('google')) {
  throw new Error('Google OAuth is not configured');
}
const clientId = Config.GOOGLE_CLIENT_ID;
const clientSecret = Config.GOOGLE_CLIENT_SECRET;
const callbackUrl = Config.GOOGLE_CALLBACK_URL;
// Ensure values exist before usage (though isProviderConfigured should validate)
if (!clientId || !clientSecret || !callbackUrl) {
  throw new Error('Google OAuth configuration incomplete');
}

// RabbitMQEventPublisher.ts
// Type-safe error handling
conn.on('error', (err: unknown) => {
  if (err instanceof Error) {
    logger.error('RabbitMQ connection error.', { error: err.message });
  }
});
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | JwtTokenProvider token generation with empty roles | Test that `user.roles[0] ?? Role.CLIENT` correctly falls back to `Role.CLIENT` when array is empty |
| Unit | GoogleOAuthProvider initialization with missing config | Test that explicit checks throw appropriate errors when config is missing |
| Unit | GitHubOAuthProvider email handling with null values | Test that `email !== null` checks handle missing emails correctly |
| Unit | RabbitMQEventPublisher connection initialization | Test that connection is established without redundant type assertions |
| Linting | All files | Run `bun run lint` to verify no linting errors remain |

## Migration / Rollout

No migration required. These are internal code refactors with no impact on data structures, APIs, or external interfaces.

## Open Questions

- [ ] None identified. All changes are well-defined by the proposal and specification.