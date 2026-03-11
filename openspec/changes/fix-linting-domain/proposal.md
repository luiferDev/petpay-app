# Proposal: Fix Linting Errors in Identity Domain Layer

## Intent

Fix 8 linting errors in Identity service domain layer files to pass `bun run lint` without violations. These errors violate ts-standard strict rules and block CI pipelines.

## Scope

### In Scope
- Fix `no-redeclare` errors in `AccountType.ts` and `Role.ts` (type redefinitions)
- Fix `no-unused-vars` errors in `IAccountRepository.ts` (unused imports)
- Fix `prefer-optional-chain` and `strict-boolean-expressions` errors in `User.ts`

### Out of Scope
- Fixing linting errors outside domain layer (application, infrastructure)
- Adding new tests
- Refactoring business logic

## Approach

1. **Type Redefinition Fix (AccountType.ts, Role.ts)**: Use inline type extraction pattern or rename the type alias to avoid redeclaring the same name as the const.

2. **Unused Import Fix (IAccountRepository.ts)**: Remove unused `PermissionLevel` and `User` imports.

3. **Boolean Expression Fix (User.ts:68)**: Replace `!this.email` with explicit empty string check and use optional chaining for `.includes()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/domain/types/AccountType.ts` | Modified | Fix `no-redeclare` on line 7 |
| `Identity/src/domain/types/Role.ts` | Modified | Fix `no-redeclare` on lines 14, 18, 27 |
| `Identity/src/domain/repositories/IAccountRepository.ts` | Modified | Remove unused imports (lines 3-4) |
| `Identity/src/domain/entities/User.ts` | Modified | Fix email validation (line 68) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Type export changes breaking downstream imports | Low | Verify affected files after change |
| Changing validation logic affecting runtime behavior | Low | Validation logic remains equivalent |

## Rollback Plan

1. Revert changes in each file using git
2. Run `bun run lint` to verify errors return
3. No database changes required

## Dependencies

- None - this is a local code fix only

## Success Criteria

- [ ] `bun run lint` passes with 0 errors in domain layer files
- [ ] No runtime behavior changes in validation logic
- [ ] All type exports remain usable by consumers