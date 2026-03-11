# Design: Fix Linting Errors in Identity Domain Layer

## Technical Approach

Fix 8 linting errors in Identity service domain layer files to pass `bun run lint` without violations. The approach addresses each linting rule violation with targeted fixes that maintain existing behavior while satisfying ts-standard rules.

## Architecture Decisions

### Decision: Resolve no-redeclare errors in type definitions

**Choice**: Rename type aliases to use `Type` suffix pattern (`AccountTypeType`, `RoleType`, `UserRoleType`, `PermissionLevelType`)

**Alternatives considered**: 
- Use inline type extraction without naming (`typeof AccountType[keyof typeof AccountType]`)
- Disable eslint rules with comments
- Use namespace pattern

**Rationale**: The const types pattern (as mandated by AGENTS.md) requires both a const object and a type. Renaming to `XxxType` is the cleanest solution that maintains the single-source-of-truth pattern, keeps exports usable by consumers, and doesn't require disabling lint rules. This follows TypeScript best practices for avoiding name collisions.

### Decision: Remove unused imports in IAccountRepository.ts

**Choice**: Remove unused `PermissionLevel` and `User` imports completely

**Alternatives considered**:
- Keep imports if they might be needed for future interface expansion
- Comment out instead of removing

**Rationale**: Unused imports are dead code that increases bundle size and confuses developers. Removing them is the standard fix - if needed later, they can be re-added.

### Decision: Fix boolean expression in User.ts validation

**Choice**: Use explicit empty string check `this.email !== ''` and optional chaining `this.email?.includes('@')`

**Alternatives considered**:
- Use `!this.email || !this.email.includes('@')` with a comment to disable the rule
- Convert to `this.email?.includes('@') === true` for explicit boolean

**Rationale**: The strict-boolean-expressions rule requires explicit checks for empty string (not just falsy), and prefer-optional-chain recommends optional chaining for method calls on potentially undefined values. This maintains the same validation logic while satisfying both rules.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Lint Fixes (Local Code Changes Only)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AccountType.ts ──→ Rename type alias ──→ exports fixed    │
│  Role.ts        ──→ Rename 3 type aliases ──→ exports fixed│
│  IAccountRepository.ts ──→ Remove unused imports ──→ clean │
│  User.ts        ──→ Fix boolean expressions ──→ validates  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ bun run lint        │
              │ (passes with 0 err) │
              └─────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/domain/types/AccountType.ts` | Modify | Rename `AccountType` type to `AccountTypeType` on line 7 |
| `Identity/src/domain/types/Role.ts` | Modify | Rename `Role`, `UserRole`, `PermissionLevel` types to `RoleType`, `UserRoleType`, `PermissionLevelType` on lines 14, 18, 27 |
| `Identity/src/domain/repositories/IAccountRepository.ts` | Modify | Remove unused `PermissionLevel` (line 3) and `User` (line 4) imports |
| `Identity/src/domain/entities/User.ts` | Modify | Change line 68 to use `this.email !== ''` and optional chaining |

## Interfaces / Contracts

No new interfaces or contracts are introduced. This is a lint-only fix with no behavioral changes.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Lint | All domain layer files pass | Run `bun run lint` after changes |
| Build | No type errors | Run `bun run build` if available |
| Runtime | Validation logic unchanged | Manual verification of User entity validation |

## Migration / Rollout

No migration required. This is a local code fix with no database, configuration, or runtime changes.

## Open Questions

- [x] None - all linting issues are straightforward fixes with clear solutions