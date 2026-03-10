# Proposal: Add Test Coverage to Identity Service

## Intent

The Identity service currently lacks comprehensive test coverage. While some OAuth-related unit tests exist (OAuthLoginUseCase, OAuthController, OAuthStateManager), critical business logic remains untested. This poses a HIGH severity risk for reliability as regressions can go undetected and deployment confidence is low.

## Scope

### In Scope
- Add unit tests for all Auth use cases (RegisterUserUseCase, LoginUseCase)
- Add unit tests for AuthController (register, login endpoints)
- Add unit tests for registration strategies (UserRegisterStrategy, ServiceProviderRegistrationStrategy, AdminRegistrationStrategy)
- Add unit tests for core services (JwtTokenProvider, NodemailerService)
- Add unit tests for domain entities (User)
- Add unit tests for middleware (auth.middleware, validation.middleware, error.handler)
- Add integration tests for authentication flow (register → login → token refresh)
- Configure test coverage reporting

### Out of Scope
- E2E tests (deferred to future)
- OAuth provider integration tests (mocked)
- Database integration tests with real PostgreSQL
- Performance/load testing

## Approach

Use **bun:test** (built-in testing framework) with the following strategy:

1. **Mocking Strategy**: Use `bun:mock` for external dependencies (JWT, email, OAuth providers)
2. **Test Organization**: Mirror source structure with `__tests__` directories
3. **Coverage**: Target 70% code coverage minimum for use cases and services

| Component | Testing Approach |
|-----------|-----------------|
| Use Cases | Unit test with mocked repositories/ports |
| Controllers | Unit test with mocked middleware |
| Services | Unit test with mocked external calls |
| Middleware | Unit test with mock req/res/next |
| Domain Entities | Unit test for validation logic |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Identity/src/application/use-case/auth/__tests__/` | New | Add RegisterUserUseCase.test.ts, LoginUseCase.test.ts |
| `Identity/src/infrastructure/http/controllers/__tests__/` | Modified | Add auth-controller.test.ts |
| `Identity/src/application/strategies/registration/__tests__/` | New | Add strategy test files |
| `Identity/src/infrastructure/services/__tests__/` | New | Add JwtTokenProvider.test.ts, NodemailerService.test.ts |
| `Identity/src/infrastructure/http/middlewares/__tests__/` | New | Add middleware test files |
| `Identity/src/domain/entities/__tests__/` | New | Add User.test.ts |
| `Identity/package.json` | Modified | Add test script if missing |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tests slow down CI/CD | Medium | Keep tests fast (<100ms each), use parallel execution |
| Mocking external services incorrectly | Medium | Test against real service interfaces |
| Test maintenance burden | Low | Follow AAA pattern, keep tests focused |

## Rollback Plan

1. Remove test files from `__tests__` directories
2. Revert any changes to package.json
3. Tests are additive only, no production code changes

## Dependencies

- `bun:test` (already available with Bun)
- No external mocking library needed (use built-in `bun:mock`)

## Success Criteria

- [ ] All Auth use cases have unit tests (RegisterUserUseCase, LoginUseCase)
- [ ] AuthController has unit tests for all endpoints
- [ ] All registration strategies have unit tests
- [ ] JwtTokenProvider has unit tests
- [ ] Auth middleware has unit tests
- [ ] Minimum 70% code coverage on use cases and services
- [ ] All tests pass: `bun test`
