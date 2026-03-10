# Design: Identity Hexagonal Architecture Enhancement

## Technical Approach

This design implements the hexagonal architecture enhancement for the Identity service through an incremental migration approach that maintains backward compatibility. The strategy involves:

1. **Port Consolidation**: Moving repository port interfaces from `application/ports/` to `domain/repositories/` while maintaining re-exports for backward compatibility
2. **Adapter Renaming**: Renaming repository implementation files to follow the `Adapter` suffix convention
3. **DI Pattern Enforcement**: Ensuring all DI registrations use explicit generic types
4. **Documentation**: Adding hexagonal architecture patterns to AGENTS.md

This approach aligns with the spec requirements for port interface placement, adapter naming conventions, DI consistency, and backward compatibility through re-exports.

## Architecture Decisions

### Decision: Port Interface Placement Strategy

**Choice**: Domain aggregate repository ports (IUserRepository, IAccountRepository, IOAuthUserRepository) belong in `domain/repositories/`. Application service ports (IEmailService, ITokenProvider, IEventPublisher) remain in `application/ports/`.

**Alternatives considered**: 
- Moving all ports to domain layer
- Keeping all ports in application layer

**Rationale**: The spec explicitly distinguishes between domain ports (persistence contracts for aggregates) and application ports (external service contracts). The domain layer should own persistence interfaces since they define the contract for accessing aggregates. Application ports remain appropriate for external services that are infrastructure concerns.

### Decision: Adapter Naming Convention

**Choice**: Use `{Technology}{Entity}Adapter` pattern for implementations. Examples: `DrizzleUserAdapter`, `OAuthUserAdapter`.

**Alternatives considered**:
- `{Entity}Repository` (previous convention, being replaced)
- `{Entity}Impl` (used by OAuthUserRepository currently)

**Rationale**: The "Adapter" suffix explicitly communicates the hexagonal architecture pattern - these are adapters connecting the domain/application layers to infrastructure. The `{Technology}{Entity}` prefix (Drizzle, OAuth) clearly identifies the technology/implementation without polluting the domain layer naming.

### Decision: Backward Compatibility Strategy

**Choice**: Maintain re-export files at old import paths for moved interfaces and renamed files.

**Alternatives considered**:
- Breaking all imports and requiring updates across codebase
- Using TypeScript path aliases

**Rationale**: The proposal explicitly requires no breaking changes. Re-exports are the simplest approach that maintains existing import statements while enforcing the new organization. This is a one-time migration cost.

### Decision: IAccountRepository Location

**Choice**: Move `IAccountRepository` to `domain/repositories/IAccountRepository.ts` (create new file).

**Alternatives considered**: 
- Keeping it in application/ports since Account is a related entity

**Rationale**: IAccountRepository is a persistence contract for the Account aggregate - it belongs in domain/repositories per the spec. The file currently exists in application/ports but should be consolidated.

### Decision: IOAuthUserRepository Location

**Choice**: Move `IOAuthUserRepository` to `domain/repositories/IOAuthUserRepository.ts`.

**Alternatives considered**: Keep in application/ports as it's OAuth-related

**Rationale**: IOAuthUserRepository is a persistence contract for OAuth provider records - it's a repository interface and belongs with other domain repositories.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ RegisterUser    │  │ LoginUseCase     │  │ OAuthLoginUseCase│ │
│  │ UseCase         │  │                 │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼───────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ IUserRepository│  │IAccountRepository│  │IOAuthUserRepository│
│  │ (Port)         │  │ (Port)           │  │ (Port)          │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ DrizzleUser     │  │ DrizzleAccount  │  │ OAuthUser       │   │
│  │ Adapter         │  │ Adapter         │  │ Adapter         │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
│           │                     │                     │             │
│           └─────────────────────┴─────────────────────┘             │
│                                 │                                    │
│                                 ▼                                    │
│                    ┌─────────────────────┐                          │
│                    │   PostgreSQL DB     │                          │
│                    └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/domain/repositories/IAccountRepository.ts` | Create | New location for Account repository port (moved from application/ports) |
| `Identity/src/domain/repositories/IOAuthUserRepository.ts` | Create | New location for OAuth repository port (moved from application/ports) |
| `Identity/src/application/ports/IAccountRepository.ts` | Modify | Replace with re-export from domain/repositories |
| `Identity/src/application/ports/IOAuthUserRepository.ts` | Modify | Replace with re-export from domain/repositories |
| `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts` | Create | Renamed from drizzle.user.repository.ts with class rename |
| `Identity/src/infrastructure/database/repositories/drizzle.user.repository.ts` | Delete | Old file removed after rename |
| `Identity/src/infrastructure/database/repositories/OAuthUserAdapter.ts` | Create | Renamed from OAuthUserRepository.ts with class rename |
| `Identity/src/infrastructure/database/repositories/OAuthUserRepository.ts` | Delete | Old file removed after rename |
| `Identity/src/infrastructure/DI/container.ts` | Modify | Update import paths and class names for renamed adapters |
| `Identity/AGENTS.md` | Modify | Add Hexagonal Architecture section documenting patterns |

### Detailed File Changes

#### New Files Created

1. **`Identity/src/domain/repositories/IAccountRepository.ts`**
   - Move content from `application/ports/IAccountRepository.ts`

2. **`Identity/src/domain/repositories/IOAuthUserRepository.ts`**
   - Move content from `application/ports/IOAuthUserRepository.ts`

3. **`Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts`**
   - Copy content from `drizzle.user.repository.ts`
   - Rename class from `DrizzleUserRepository` to `DrizzleUserAdapter`

4. **`Identity/src/infrastructure/database/repositories/OAuthUserAdapter.ts`**
   - Copy content from `OAuthUserRepository.ts`
   - Rename class from `OAuthUserRepositoryImpl` to `OAuthUserAdapter`

#### Modified Files

1. **`Identity/src/application/ports/IAccountRepository.ts`**
   ```typescript
   // Re-export from new location for backward compatibility
   export { IAccountRepository } from '../../domain/repositories/IAccountRepository'
   ```

2. **`Identity/src/application/ports/IOAuthUserRepository.ts`**
   ```typescript
   // Re-export from new location for backward compatibility
   export { IOAuthUserRepository, CreateOAuthUserRecord, OAuthUserRecord, UpdateOAuthTokens } 
     from '../../domain/repositories/IOAuthUserRepository'
   ```

3. **`Identity/src/infrastructure/DI/container.ts`**
   - Update imports: `DrizzleUserAdapter` instead of `DrizzleUserRepository`
   - Update imports: `OAuthUserAdapter` instead of `OAuthUserRepositoryImpl`

4. **`Identity/AGENTS.md`**
   - Add new section "Hexagonal Architecture" documenting:
     - Port interface locations (domain/repositories vs application/ports)
     - Adapter naming conventions (Adapter suffix)
     - DI registration patterns
     - Examples

#### Deleted Files

1. **`Identity/src/infrastructure/database/repositories/drizzle.user.repository.ts`**
   - Content moved to `DrizzleUserAdapter.ts`

2. **`Identity/src/infrastructure/database/repositories/OAuthUserRepository.ts`**
   - Content moved to `OAuthUserAdapter.ts`

## Interfaces / Contracts

### Domain Repository Ports (in `domain/repositories/`)

```typescript
// IUserRepository.ts - existing
export interface IUserRepository {
  save: (user: User) => Promise<User>
  findById: (id: string) => Promise<User | null>
  findByEmail: (email: string) => Promise<User | null>
  existsByEmail: (email: string) => Promise<boolean>
  deleteById: (id: string) => Promise<void>
}

// New: IAccountRepository.ts
export interface IAccountRepository {
  createAccountAndAssignOwner: (
    accountName: string,
    type: AccountType,
    userId: string,
  ) => Promise<Account>
}

// New: IOAuthUserRepository.ts
export interface IOAuthUserRepository {
  findByProviderAndId: (provider: 'google' | 'github', providerUserId: string) => Promise<OAuthUserRecord | null>
  findByUserIdAndProvider: (userId: string, provider: 'google' | 'github') => Promise<OAuthUserRecord | null>
  findByUserId: (userId: string) => Promise<OAuthUserRecord[]>
  create: (record: CreateOAuthUserRecord) => Promise<OAuthUserRecord>
  updateTokens: (id: string, tokens: UpdateOAuthTokens) => Promise<void>
  delete: (id: string) => Promise<void>
  deleteByUserId: (userId: string) => Promise<void>
}
```

### Application Service Ports (remain in `application/ports/`)

```typescript
// Existing ports to remain unchanged:
export interface IEmailService { /* ... */ }
export interface ITokenProvider { /* ... */ }
export interface IEventPublisher { /* ... */ }
export interface IOAuthProvider { /* ... */ }
```

### Infrastructure Adapters (in `infrastructure/database/repositories/`)

```typescript
// DrizzleUserAdapter.ts
@injectable()
export class DrizzleUserAdapter implements IUserRepository {
  // implements all IUserRepository methods
}

// OAuthUserAdapter.ts
export class OAuthUserAdapter implements IOAuthUserRepository {
  // implements all IOAuthUserRepository methods
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Adapter class methods | Mock DB client, test mapper functions |
| Unit | Port interfaces | Verify implementations satisfy contracts |
| Integration | DI container resolution | Verify adapters resolve correctly |
| Integration | Use case to adapter flow | Full flow with test DB |

### Test File Updates Required

1. **`__tests__` files importing renamed adapters**:
   - Update imports from `drizzle.user.repository.ts` to `DrizzleUserAdapter`
   - Update imports from `OAuthUserRepository.ts` to `OAuthUserAdapter`

2. **Mock updates**:
   - Ensure mocks implement the port interfaces correctly
   - No interface changes required (ports remain the same)

### Test Execution Plan

```bash
# Run all tests before changes (baseline)
bun test

# After implementing changes, run tests
bun test

# If tests fail, verify:
# 1. Import paths updated correctly
# 2. Class names updated in test files
# 3. Re-exports working for backward compatibility

# Run lint to verify code style
bun run lint
```

## Migration / Rollout

No data migration required. This is a refactoring-only change.

### Rollback Plan

1. **Easy revert**: All changes are file-based (renames, moves, re-exports)
2. **Git revert**: Can revert entire PR if issues arise
3. **Backward compatibility**: Re-exports ensure existing imports work
4. **No schema changes**: Database remains unchanged

### Transition Phases

1. **Phase 1**: Create new domain repository files
2. **Phase 2**: Update application/ports to re-export from domain
3. **Phase 3**: Create renamed adapter files (Adapter suffix)
4. **Phase 4**: Update DI container imports
5. **Phase 5**: Delete old files
6. **Phase 6**: Update tests and verify all pass
7. **Phase 7**: Update AGENTS.md documentation

## Open Questions

- [ ] Should `IAccountRepository` be created in domain/repositories or is the current application/ports location acceptable for an "Account" entity that may not be a full aggregate?
- [ ] Confirm whether the OAuth adapter should be in `database/repositories` or a separate `adapters/` directory within infrastructure.
- [ ] Should we add integration tests specifically for the re-export backward compatibility?

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test failures due to renamed imports | Medium | Medium | Run tests immediately after changes, update imports |
| Circular dependency issues | Low | High | Keep domain layer free of infrastructure imports |
| Re-export path issues | Low | Medium | Verify with simple import test |
| Missing JSDoc on new files | Low | Low | Add documentation when creating files |
