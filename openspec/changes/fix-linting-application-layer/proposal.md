# Proposal: Fix Linting Errors in Identity Service Application Layer

## Intent

Fix 36 linting errors across Identity service application layer files to ensure code quality and adherence to TypeScript standards. The errors include forbidden non-null assertions, nullable string value handling, unused variables/imports, and strict-boolean-expressions violations. This change addresses technical debt and improves code maintainability.

## Scope

### In Scope
- Fix non-null assertion errors (`!`) in application layer files
- Replace `||` with `??` for optional values
- Remove unused variables and imports
- Use explicit boolean expressions in conditionals
- Apply Context7 patterns for TypeScript best practices

### Out of Scope
- Changes to domain layer entities or repositories
- Modifications to infrastructure layer implementations
- Changes to test frameworks or test runners
- Database schema modifications

## Approach

### Technical Strategy Based on Context7 Guidance

1. **Replace Non-Null Assertions with Explicit Checks**
   - Replace `value!` with `value !== null && value !== undefined`
   - Add proper null checks before accessing properties
   - Example: `user.id!` → `user.id !== undefined ? user.id : throw new Error('User ID required')`

2. **Use Nullish Coalescing Operator (`??`)**
   - Replace `||` with `??` for optional string values
   - Example: `request.cookieState || ''` → `request.cookieState ?? ''`

3. **Remove Unused Code**
   - Identify and remove unused variables and imports
   - Run `bun run lint:fix` to automatically fix some issues

4. **Explicit Boolean Expressions**
   - Replace implicit truthiness checks with explicit comparisons
   - Example: `if (value)` → `if (value !== null && value !== undefined)`

### Affected Files and Specific Issues

| File | Issue Type | Line(s) | Context7 Pattern Applied |
|------|------------|---------|--------------------------|
| `LoginUseCase.ts` | Non-null assertion | 68 | Replace `user.id!` with explicit check |
| `RegisterUserUseCase.ts` | Non-null assertion, `any` type | 119, 125 | Replace `savedUser.id!`, type `error` properly |
| `AdminRegistrationStrategy.ts` | Non-null assertion | 31 | Replace `user.id!` with explicit check |
| `UserRegisterStrategy.ts` | Non-null assertion | 41, 67 | Replace `user.id!` with explicit check |
| `OAuthLoginUseCase.ts` | Non-null assertions, `||` operator, `as any` | 98, 136, 143, 179, 192, 220 | Apply multiple Context7 patterns |
| `LinkOAuthProviderUseCase.ts` | `||` operator | 72 | Replace with `??` |
| Test files | Various | Multiple | Apply same patterns as main files |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/application/use-case/auth/LoginUseCase.ts` | Modified | Replace `user.id!` with explicit null check |
| `Identity/src/application/use-case/auth/RegisterUserUseCase.ts` | Modified | Replace `savedUser.id!`, type error parameter properly |
| `Identity/src/application/strategies/registration/AdminRegistrationStrategy.ts` | Modified | Replace `user.id!` with explicit null check |
| `Identity/src/application/strategies/registration/UserRegisterStrategy.ts` | Modified | Replace `user.id!` with explicit null check in two methods |
| `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts` | Modified | Apply multiple Context7 patterns across file |
| `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts` | Modified | Replace `||` with `??` operator |
| `Identity/src/application/use-case/auth/__tests__/LoginUseCase.test.ts` | Modified | Apply same patterns to test code |
| `Identity/src/application/use-case/auth/__tests__/RegisterUserUseCase.concurrency.test.ts` | Modified | Apply same patterns to test code |
| `Identity/src/application/use-case/oauth/__tests__/OAuthLoginUseCase.test.ts` | Modified | Apply same patterns to test code |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing functionality with null checks | Low | Add proper error handling and validation |
| Introducing new bugs during refactoring | Medium | Run existing tests after changes |
| Missing some linting errors | Low | Run `bun run lint` to verify all errors fixed |
| Test failures due to changed error handling | Medium | Update test expectations if needed |

## Rollback Plan

1. Revert all changes in affected application layer files
2. Run `bun run lint` to confirm linting errors return to original state
3. Run `bun test` to ensure tests pass with original code
4. If issues arise, restore from version control

## Dependencies

- TypeScript/Node.js environment
- `bun run lint:fix` command available
- Access to Identity service source code
- Git version control for rollback capability

## Success Criteria

- [ ] All 36 linting errors in application layer files are resolved
- [ ] `bun run lint` passes without errors in Identity service
- [ ] All existing tests continue to pass
- [ ] Code follows Context7 patterns for TypeScript best practices
- [ ] No new linting errors introduced
- [ ] Changes are minimal and focused on linting fixes only