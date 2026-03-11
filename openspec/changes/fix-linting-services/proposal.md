# Proposal: Fix Linting Errors in Identity Services

## Intent

Resolve 20+ linting errors in Identity service infrastructure services to ensure code quality and adherence to `ts-standard` rules. This addresses `strict-boolean-expressions`, `prefer-nullish-coalescing`, and `consistent-type-assertions` errors in critical service files.

## Scope

### In Scope
- Fix `JwtTokenProvider.ts`: Replace `||` with `??` for optional value fallback
- Fix `GoogleOAuthProvider.ts`: Handle nullable config values without non-null assertions
- Fix `GitHubOAuthProvider.ts`: Handle nullable config values without non-null assertions
- Fix `RabbitMQEventPublisher.ts`: Remove `any` usage and fix type assertions

### Out of Scope
- Changes to test files (unless strictly required by linting)
- Changes to database or repository adapters
- Changes to API controllers or routes

## Approach

1.  **JwtTokenProvider.ts**:
    -   Replace `role: user.roles[0] || Role.CLIENT` with `role: user.roles[0] ?? Role.CLIENT`
    -   Ensure strict boolean expressions are used in conditionals.

2.  **GoogleOAuthProvider.ts & GitHubOAuthProvider.ts**:
    -   Replace `Config.FIELD!` assertions with explicit checks or fallbacks.
    -   Validate that `isProviderConfigured` correctly handles missing config before accessing properties.

3.  **RabbitMQEventPublisher.ts**:
    -   Replace `as unknown as amqp.Connection` with proper type guarding or initialization.
    -   Replace `err: any` with `err: unknown` and handle type narrowing.
    -   Replace `as any` in `close()` method with proper type handling.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/services/JwtTokenProvider.ts` | Modified | Fixes nullish coalescing and boolean expression errors |
| `Identity/src/infrastructure/services/GoogleOAuthProvider.ts` | Modified | Removes non-null assertions on config values |
| `Identity/src/infrastructure/services/GitHubOAuthProvider.ts` | Modified | Removes non-null assertions on config values |
| `Identity/src/infrastructure/messaging/RabbitMQEventPublisher.ts` | Modified | Fixes type assertions and removes `any` usage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Configuration values might be undefined at runtime | Low | Add explicit checks or default values based on `isProviderConfigured` |
| Type assertion errors in RabbitMQ connection | Low | Use proper type guards or optional chaining |

## Rollback Plan

1.  Revert changes in the affected service files using git.
2.  Run `bun run lint` to confirm previous linting errors are restored.
3.  Restart Identity service to ensure runtime behavior is unchanged.

## Dependencies

- None (pure code refactoring)

## Success Criteria

- [ ] `bun run lint` passes without errors in Identity service
- [ ] All service files compile without TypeScript errors
- [ ] No runtime behavior changes introduced
- [ ] Configuration validation remains secure (no accidental exposure of secrets)
