# Proposal: Fix Linting Errors in Identity Repository Files

## Intent

Fix 14 linting errors in Identity service repository files to maintain code quality and adhere to TypeScript best practices. The errors involve strict-boolean-expressions, prefer-nullish-coalescing, and other linting rules that improve code clarity and prevent potential bugs.

## Scope

### In Scope
- Fix linting errors in `Identity/src/infrastructure/database/repositories/DrizzleAccountAdapter.ts`
- Fix linting errors in `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts`
- Fix linting errors in `Identity/src/infrastructure/database/repositories/OAuthUserAdapter.ts`
- Fix linting errors in `Identity/src/domain/repositories/IAccountRepository.ts`
- Apply Context7 guidance patterns for nullable value handling

### Out of Scope
- Fixing linting errors in other Identity service directories (controllers, services, middleware, etc.)
- Modifying business logic or functionality
- Changing interface contracts or method signatures
- Updating test files or documentation

## Approach

Apply the following Context7 guidance patterns specifically to repository files:

1. **Replace `||` with `??` for optional values**: Use nullish coalescing operator for handling null/undefined values instead of logical OR
2. **Replace `!` with explicit null checks**: Use explicit conditions instead of non-null assertions where appropriate
3. **Handle nullable strings in conditionals**: Properly check for empty strings, null, and undefined values

The fixes will be isolated to repository files only, maintaining backward compatibility and not affecting any business logic.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/database/repositories/DrizzleAccountAdapter.ts` | Modified | Fix strict-boolean-expressions and prefer-nullish-coalescing errors |
| `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts` | Modified | Fix strict-boolean-expressions and prefer-nullish-coalescing errors |
| `Identity/src/infrastructure/database/repositories/OAuthUserAdapter.ts` | Modified | Fix strict-boolean-expressions and prefer-nullish-coalescing errors |
| `Identity/src/domain/repositories/IAccountRepository.ts` | Modified | Fix type annotations and nullable value handling |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unintended behavior changes due to nullish coalescing vs logical OR differences | Low | Carefully review each change; `??` only triggers on null/undefined, while `||` triggers on all falsy values |
| Breaking existing functionality with explicit null checks | Low | Maintain existing logic flow; only change operator syntax, not conditions |
| IDE/editor compatibility with new syntax | Low | Standard TypeScript syntax; no special configuration required |

## Rollback Plan

1. **Immediate rollback**: Use `git revert` on the commit that introduced the linting fixes
2. **Manual rollback**: Restore previous versions of affected files from version control
3. **Testing**: After rollback, run `bun run lint` to confirm original linting errors return as expected
4. **Verification**: Ensure no functional regressions by running existing tests with `bun test`

## Dependencies

- TypeScript 5.x (already in project)
- ts-standard linting configuration (already configured in Identity service)
- No external package updates required

## Success Criteria

- [ ] All 14 linting errors in repository files are resolved
- [ ] `bun run lint` passes without errors in Identity service
- [ ] No functional regressions in existing functionality
- [ ] Code follows Context7 guidance patterns for nullable value handling
- [ ] All changes are isolated to repository directory only