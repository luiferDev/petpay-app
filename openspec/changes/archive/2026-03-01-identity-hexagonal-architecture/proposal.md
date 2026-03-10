# Proposal: Identity Hexagonal Architecture Enhancement

## Intent

Enhance hexagonal architecture patterns in the Identity service by consolidating ports in the domain layer, standardizing adapter naming conventions, and improving the overall architecture consistency. The goal is to strengthen the Clean Architecture foundation without introducing breaking changes or requiring a full refactoring effort.

## Scope

### In Scope
- Consolidate all port interfaces in the domain layer for centralized access
- Add "Adapter" suffix naming convention to repository implementations
- Document existing hexagonal patterns in a new architecture guide
- Ensure dependency injection follows consistent patterns across the codebase
- Add type-safe port interfaces for all repositories

### Out of Scope
- Full refactoring of existing code
- Breaking changes to public APIs
- Modifications to Marketplace or Catalog services
- Changes to database schema or Drizzle configuration
- Adding new business logic or features

## Approach

Use an incremental enhancement approach that adds hexagonal architecture patterns without disrupting existing functionality:

1. **Audit Phase**: Review existing ports in `Identity/src/application/ports` and repository implementations
2. **Consolidation Phase**: Move port interfaces to `Identity/src/domain/repositories` where appropriate
3. **Naming Phase**: Rename repository implementations to follow Adapter suffix convention
4. **Documentation Phase**: Create architecture guide documenting the patterns used

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/domain/repositories` | New | New location for consolidated port interfaces |
| `Identity/src/application/ports` | Modified | Review and migrate existing ports to domain |
| `Identity/src/infrastructure/database/repositories` | Modified | Rename implementations to use Adapter suffix |
| `Identity/src/infrastructure/DI` | Modified | Update DI container registrations if needed |
| `Identity/AGENTS.md` | Modified | Add hexagonal architecture patterns section |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DI changes may require test updates | Medium | Run existing tests after changes, update mocks as needed |
| Breaking import paths | Low | Maintain re-exports from old locations during transition |
| Naming conflicts with existing files | Low | Use Adapter suffix only where clear improvement |

## Rollback Plan

1. Keep all existing tests passing before and after changes
2. Maintain re-export paths from old import locations
3. Easy to revert: naming changes are simple file renames
4. No database schema changes required
5. Use git to quickly revert if issues arise

## Dependencies

- Identity service must be running (bun run dev) to verify tests pass
- No external dependencies required

## Success Criteria

- [ ] All existing tests pass (`bun test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Port interfaces consolidated in domain layer
- [ ] Repository implementations follow Adapter suffix naming
- [ ] No breaking changes to existing imports (use re-exports)
- [ ] Architecture documentation added to AGENTS.md
