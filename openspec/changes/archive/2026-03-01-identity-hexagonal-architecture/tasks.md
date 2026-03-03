# Tasks: Identity Hexagonal Architecture Enhancement

## Phase 1: Foundation - Domain Ports & Adapter Creation

- [x] 1.1 Create `Identity/src/domain/repositories/IAccountRepository.ts` with port interface (move content from application/ports)
- [x] 1.2 Create `Identity/src/domain/repositories/IOAuthUserRepository.ts` with port interface (move content from application/ports)
- [x] 1.3 Create `Identity/src/infrastructure/database/repositories/DrizzleUserAdapter.ts` (rename class from DrizzleUserRepository to DrizzleUserAdapter)
- [x] 1.4 Create `Identity/src/infrastructure/database/repositories/OAuthUserAdapter.ts` (rename class from OAuthUserRepositoryImpl to OAuthUserAdapter)

## Phase 2: Core - Re-exports & DI Updates

- [x] 2.1 Modify `Identity/src/application/ports/IAccountRepository.ts` - replace with re-export from domain/repositories
- [x] 2.2 Modify `Identity/src/application/ports/IOAuthUserRepository.ts` - replace with re-export from domain/repositories
- [x] 2.3 Modify `Identity/src/infrastructure/DI/container.ts` - update imports to use DrizzleUserAdapter and OAuthUserAdapter

## Phase 3: Integration - Test & Consumer Updates

- [x] 3.1 Update test imports referencing `drizzle.user.repository.ts` to use `DrizzleUserAdapter`
- [x] 3.2 Update test imports referencing `OAuthUserRepository.ts` to use `OAuthUserAdapter`
- [x] 3.3 Search and update any remaining imports across Identity service that reference old file paths

## Phase 4: Testing - Verification

- [x] 4.1 Run `bun test` to verify all tests pass
- [x] 4.2 Run `bun run lint` to verify code style compliance

## Phase 5: Cleanup - Remove Old Files & Documentation

- [x] 5.1 Delete `Identity/src/infrastructure/database/repositories/drizzle.user.repository.ts` (old file)
- [x] 5.2 Delete `Identity/src/infrastructure/database/repositories/OAuthUserRepository.ts` (old file)
- [x] 5.3 Modify `Identity/AGENTS.md` - add Hexagonal Architecture section documenting port/interface locations, adapter naming conventions, and DI patterns
