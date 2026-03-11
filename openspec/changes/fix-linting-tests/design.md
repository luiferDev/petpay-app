# Design: Fix Linting Errors in Identity Service Test Files

## Technical Approach

This design addresses 11 specific linting errors across 5 test files in the Identity service using ts-standard rules. The approach follows the proposal's strategy of applying targeted fixes for each error type:

1. **prefer-promise-reject-errors**: Replace plain object rejections with Error objects
2. **no-floating-promises**: Use `void` keyword for mocked module imports
3. **restrict-template-expressions**: Add type assertions in template literals
4. **strict-boolean-expressions**: Use explicit checks for any values

The changes are isolated to test files only, ensuring no impact on production logic. Each fix follows the existing test patterns and conventions defined in Identity/AGENTS.md.

## Architecture Decisions

### Decision: Minimal Impact on Test Logic

**Choice**: Apply lint fixes without changing test behavior or assertions
**Alternatives considered**: 
- Refactoring tests to use different mocking strategies
- Restructuring test files for better organization
**Rationale**: The scope is strictly lint fixes; changing test logic increases risk of breaking tests without adding value.

### Decision: Type Assertions Over Runtime Checks

**Choice**: Use TypeScript type assertions (e.g., `${value as string}`) for template literals
**Alternatives considered**:
- Runtime type guards
- Avoiding template literals entirely
**Rationale**: Type assertions are sufficient for test files where runtime behavior is already validated by the test logic. This follows TypeScript best practices for test code.

### Decision: Error Objects for Promise Rejections

**Choice**: Use `new Error('message')` for promise rejections
**Alternatives considered**:
- Custom error classes (overkill for tests)
- Preserving error codes via Error properties
**Rationale**: Standard Error objects are sufficient for test assertions and comply with `prefer-promise-reject-errors` rule.

## Data Flow

No data flow changes required - this is a test-only fix.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/application/use-case/auth/__tests__/LoginUseCase.test.ts` | Modify | Remove unused `ITokenService` import; fix type assertions in template literals |
| `Identity/src/application/use-case/auth/__tests__/RegisterUserUseCase.concurrency.test.ts` | Modify | Use `void` for mocked module imports; remove unused `longBcryptHash` variable |
| `Identity/src/application/use-case/oauth/__tests__/OAuthLoginUseCase.test.ts` | Modify | Replace `require('crypto')` with import; fix promise rejections |
| `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` | Modify | Remove duplicate `return null`; fix type assertions in template literals |
| `Identity/src/infrastructure/http/controllers/__tests__/OAuthController.test.ts` | Modify | Remove unused `stateManager` variable; fix dynamic delete pattern |

## Interfaces / Contracts

No interface changes required - this is a test-only fix.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Lint rule compliance | Run `bun run lint` to verify all 11 errors are resolved |
| Integration | Test behavior unchanged | Run `bun test` for affected test files to ensure no regressions |
| E2E | N/A | Not applicable for lint fixes |

## Migration / Rollout

No migration required. Changes are isolated to test files and can be applied directly.

## Open Questions

- [ ] None - all fixes are straightforward lint corrections
