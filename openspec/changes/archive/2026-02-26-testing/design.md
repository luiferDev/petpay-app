# Design: Add Test Coverage to Identity Service

## Technical Approach

Implement comprehensive unit and integration tests for the Identity service using `bun:test` with `bun:mock` for external dependencies. Follow the existing test patterns already established in the OAuth tests.

## Architecture Decisions

### Decision: Testing Framework

**Choice**: Use `bun:test` (built-in) with `bun:mock`
**Alternatives considered**: Jest, Vitest
**Rationale**: Already available with Bun runtime, matches existing OAuth test patterns, fast execution

### Decision: Test Organization

**Choice**: Mirror source structure with `__tests__` directories
**Alternatives considered**: Single tests/ directory at root
**Rationale**: Follows existing OAuth test pattern, easier to locate tests for each module

### Decision: Mocking Strategy

**Choice**: Use `bun:mock` (via `vi.fn()`) for all external dependencies
**Alternatives considered**: Mock Service Virtualization, test containers
**Rationale**: Simple, fast, matches existing OAuth test patterns

### Decision: Coverage Target

**Choice**: 70% minimum line coverage for use cases, services, and controllers
**Alternatives considered**: 80%, no coverage requirement
**Rationale**: Balanced target achievable without testing every edge case; sufficient for regression detection

## Data Flow

```
Test File
    │
    ├── vi.fn() mocks → Dependencies (repositories, services)
    │
    ├── Instantiate Class/Function
    │
    ├── Call method with test input
    │
    └── Assert expected output
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/application/use-case/auth/__tests__/RegisterUserUseCase.test.ts` | Create | Unit tests for registration use case |
| `Identity/src/application/use-case/auth/__tests__/LoginUseCase.test.ts` | Create | Unit tests for login use case |
| `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.test.ts` | Create | Unit tests for auth controller |
| `Identity/src/application/strategies/registration/__tests__/UserRegisterStrategy.test.ts` | Create | Unit tests for user strategy |
| `Identity/src/application/strategies/registration/__tests__/ServiceProviderRegistrationStrategy.test.ts` | Create | Unit tests for SP strategy |
| `Identity/src/application/strategies/registration/__tests__/AdminRegistrationStrategy.test.ts` | Create | Unit tests for admin strategy |
| `Identity/src/infrastructure/services/__tests__/JwtTokenProvider.test.ts` | Create | Unit tests for JWT service |
| `Identity/src/infrastructure/services/__tests__/NodemailerService.test.ts` | Create | Unit tests for email service |
| `Identity/src/infrastructure/http/middlewares/__tests__/auth.middleware.test.ts` | Create | Unit tests for auth middleware |
| `Identity/src/infrastructure/http/middlewares/__tests__/validation.middleware.test.ts` | Create | Unit tests for validation middleware |
| `Identity/src/infrastructure/http/middlewares/__tests__/error.handler.test.ts` | Create | Unit tests for error handler |
| `Identity/src/domain/entities/__tests__/User.test.ts` | Create | Unit tests for User entity |
| `Identity/src/application/use-case/auth/__tests__/auth-flow.integration.test.ts` | Create | Integration tests for auth flow |
| `Identity/package.json` | Modify | Add test script and coverage config |

## Interfaces / Contracts

### Test Structure Pattern (following existing OAuth tests)

```typescript
import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { ClassToTest } from '../ClassToTest'
import type { MockInterface } from '../../../ports/MockInterface'

describe('ClassToTest', () => {
  let instance: ClassToTest
  let mockDependency: MockInterface

  beforeEach(() => {
    mockDependency = {
      method: vi.fn()
    }
    instance = new ClassToTest(mockDependency)
  })

  describe('Happy Path', () => {
    it('should do something', async () => {
      mockDependency.method.mockResolvedValue('value')
      const result = await instance.method()
      expect(result).toBe('expected')
    })
  })

  describe('Error Paths', () => {
    it('should throw error', async () => {
      mockDependency.method.mockRejectedValue(new Error('fail'))
      await expect(instance.method()).rejects.toThrow()
    })
  })
})
```

### Mock Patterns by Component Type

| Component | Mock Pattern |
|-----------|--------------|
| Repository | `vi.fn()` returning mocked data or throwing errors |
| Token Provider | `vi.fn()` for generateTokens, verifyToken |
| Email Service | `vi.fn()` for send method |
| HTTP Middleware | Mock req/res/next objects |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit - Use Cases | RegisterUserUseCase, LoginUseCase | Mock repositories, event publisher |
| Unit - Controllers | AuthController endpoints | Mock use cases, validate responses |
| Unit - Strategies | All 3 registration strategies | Mock account repository |
| Unit - Services | JwtTokenProvider, NodemailerService | Mock external calls |
| Unit - Middleware | auth, validation, error.handler | Mock req/res/next |
| Unit - Entities | User validation | Direct instantiation |
| Integration | Auth flow (register→login→refresh) | Mock DB at boundary |

## Migration / Rollback

No migration required. Tests are additive and can be removed by deleting test files.

## Open Questions

- [ ] Should we add coverage reporting to CI/CD pipeline? (Recommended: Yes, after initial tests pass)
- [ ] Should we test against in-memory SQLite for integration tests? (Deferred to future)
