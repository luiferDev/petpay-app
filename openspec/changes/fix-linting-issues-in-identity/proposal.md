# Proposal: Fix Linting Issues in Identity Service

## Intent

The Identity service currently has 182 linting errors across 37 files that violate TypeScript strictness rules and code style guidelines. These errors represent technical debt that:
1. Reduces code quality and maintainability
2. May hide potential runtime issues (e.g., using `any` types, nullable values in conditionals)
3. Violates the established code standards in `Identity/AGENTS.md`

The linting errors are primarily related to:
- `@typescript-eslint/strict-boolean-expressions` - Unexpected nullable values in conditionals
- `@typescript-eslint/prefer-nullish-coalescing` - Using `||` instead of `??`
- `@typescript-eslint/no-var-requires` - Using `require()` instead of `import`
- `@typescript-eslint/no-extraneous-class` - Classes with only static properties
- `@typescript-eslint/restrict-template-expressions` - Invalid types in template literals
- `@typescript-eslint/prefer-promise-reject-errors` - Promise rejection reasons not being Error objects
- `@typescript-eslint/strict-boolean-expressions` - Unexpected `any` values in conditionals

## Scope

### In Scope
- Run `bun run lint:fix` to auto-fix auto-fixable errors (estimated 40-50% of errors)
- Manually fix remaining errors in the following priority files:
  - `src/infrastructure/services/NodemailerService.ts` (multiple errors)
  - `src/shared/utils/concurrency.ts` (multiple errors)
  - `src/infrastructure/services/OAuthProviderFactory.ts` (multiple errors)
- Fix errors in all 37 affected files
- Ensure no breaking changes to functionality
- Run tests to verify functionality is preserved

### Out of Scope
- Refactoring for performance optimization (separate change)
- Adding new features or functionality
- Changing the architecture or design patterns
- Modifying test behavior beyond fixing linting issues

## Approach

### Step 1: Auto-fix with ts-standard
Run `bun run lint:fix` in the Identity directory to automatically fix errors that can be auto-fixed.

### Step 2: Manual fixes by error type
1. **Fix `@typescript-eslint/strict-boolean-expressions`**:
   - Replace implicit boolean checks with explicit comparisons
   - Use `??` for nullish coalescing instead of `||` for optional values
   - Example: `if (value)` → `if (value !== null && value !== undefined)`

2. **Fix `@typescript-eslint/prefer-nullish-coalescing`**:
   - Replace `||` with `??` for optional values
   - Keep `||` for fallback to empty string or default values

3. **Fix `@typescript-eslint/no-var-requires`**:
   - Replace `require()` with ES6 `import` statements
   - Move imports to top of file

4. **Fix `@typescript-eslint/restrict-template-expressions`**:
   - Ensure template literal expressions are strings or numbers
   - Convert non-string types to strings using `String()` or `toString()`

5. **Fix `@typescript-eslint/prefer-promise-reject-errors`**:
   - Ensure promise rejections throw `Error` objects
   - Replace string rejections with `new Error(message)`

6. **Fix unused variables and non-null assertions**:
   - Remove unused imports/variables
   - Replace non-null assertions (`!`) with proper null checks

### Step 3: File-specific fixes
- **NodemailerService.ts**: Fix `require('fs')` import, `any` types, and boolean expressions
- **concurrency.ts**: Fix `any` types in function signatures and error handling
- **OAuthProviderFactory.ts**: Fix potential null/undefined issues

### Step 4: Verification
- Run `bun run lint` to verify all errors are resolved
- Run `bun test` to ensure no functionality is broken
- Run `bun run lint:fix` again if any new issues arise

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/infrastructure/services/NodemailerService.ts` | Modified | Fix `require()`, `any` types, boolean expressions |
| `src/shared/utils/concurrency.ts` | Modified | Fix `any` types in function signatures |
| `src/infrastructure/services/OAuthProviderFactory.ts` | Modified | Fix potential null/undefined issues |
| `src/application/use-case/auth/LoginUseCase.ts` | Modified | Fix boolean expressions, template expressions |
| `src/application/use-case/auth/RegisterUserUseCase.ts` | Modified | Fix boolean expressions, template expressions |
| `src/infrastructure/config/env.ts` | Modified | Fix boolean expressions with nullable strings |
| `src/domain/entities/User.ts` | Modified | Fix boolean expressions, optional chaining |
| Plus 30 other files | Modified | Various linting fixes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidentally changing logic while fixing linting | Medium | Careful review of each change; run tests after each file modification |
| Breaking changes due to `any` type removal | Low | Add proper type annotations; use `unknown` when appropriate |
| Auto-fix changes that affect functionality | Low | Review auto-fix changes; run full test suite |
| Unintended behavior changes from nullish coalescing | Low | Understand difference between `||` and `??`; test edge cases |

## Rollback Plan

1. **Before starting**: Commit current state of Identity service
2. **If issues arise**: 
   - Use `git checkout HEAD -- Identity/` to revert all changes
   - Or selectively revert specific files using `git checkout HEAD -- <file>`
3. **After completion**: Keep commit history for easy rollback if needed

## Dependencies

- None (only internal code changes)

## Success Criteria

- [ ] `bun run lint` passes with 0 errors
- [ ] `bun test` passes with all tests passing
- [ ] No functionality changes introduced
- [ ] All 182 linting errors resolved
- [ ] Code follows the style guidelines in `Identity/AGENTS.md`
