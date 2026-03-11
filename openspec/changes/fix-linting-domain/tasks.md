# Tasks: Fix Linting Errors in Identity Domain Layer

## Phase 1: Core Implementation

- [x] 1.1 Fix no-redeclare in AccountType.ts: Rename type alias `AccountType` to `AccountTypeType` on line 7
- [x] 1.2 Fix no-redeclare in Role.ts: Rename type alias `Role` to `RoleType` on line 14
- [x] 1.3 Fix no-redeclare in Role.ts: Rename type alias `UserRole` to `UserRoleType` on line 18
- [x] 1.4 Fix no-redeclare in Role.ts: Rename type alias `PermissionLevel` to `PermissionLevelType` on line 27
- [x] 1.5 Fix no-unused-vars in IAccountRepository.ts: Remove unused `PermissionLevel` import from Role
- [x] 1.6 Fix no-unused-vars in IAccountRepository.ts: Remove unused `User` import from entities
- [x] 1.7 Fix strict-boolean-expressions in User.ts: Replace `!this.email` with explicit `this.email !== ''` check on line 68
- [x] 1.8 Fix prefer-optional-chain in User.ts: Add optional chaining `?.` to `this.email?.includes('@')` on line 68

## Phase 2: Testing

- [ ] 2.1 Run lint check: Execute `bun run lint` in Identity directory to verify 0 errors
- [ ] 2.2 Run tests: Execute `bun test` in Identity directory to verify no regressions