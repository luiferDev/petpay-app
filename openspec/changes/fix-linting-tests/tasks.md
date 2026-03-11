# Tasks: Fix Linting Errors in Identity Service Test Files

## Phase 1: Foundation/Infrastructure

- [ ] 1.1 Add type imports for Error handling in `Identity/src/application/use-cases/auth/LoginUseCase.test.ts` to ensure proper error object typing
- [ ] 1.2 Add type imports for Error handling in `Identity/src/application/use-cases/auth/OAuthLoginUseCase.test.ts` to ensure proper error object typing

## Phase 2: Core Implementation

- [ ] 2.1 Fix `prefer-promise-reject-errors` in `Identity/src/application/use-cases/auth/LoginUseCase.test.ts` by replacing `Promise.reject({ code: '40001' })` with `Promise.reject(new Error('40001'))`
- [ ] 2.2 Fix `prefer-promise-reject-errors` in `Identity/src/application/use-cases/auth/LoginUseCase.test.ts` for the second error case
- [ ] 2.3 Fix `strict-boolean-expressions` in `Identity/src/application/use-cases/auth/LoginUseCase.test.ts` by adding explicit type assertion for error object
- [ ] 2.4 Fix `no-floating-promises` in `Identity/src/application/use-cases/auth/RegisterUserUseCase.concurrency.test.ts` by adding `void` keyword to mocked module imports
- [ ] 2.5 Fix `restrict-template-expressions` in `Identity/src/application/use-cases/auth/RegisterUserUseCase.concurrency.test.ts` by adding type assertions for template literals
- [ ] 2.6 Fix `prefer-promise-reject-errors` in `Identity/src/application/use-cases/auth/OAuthLoginUseCase.test.ts` by replacing object rejections with Error objects
- [ ] 2.7 Fix `no-floating-promises` in `Identity/src/application/use-cases/auth/OAuthLoginUseCase.test.ts` by adding `void` keyword to mocked module imports
- [ ] 2.8 Fix `strict-boolean-expressions` in `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` by adding explicit type assertions
- [ ] 2.9 Fix `restrict-template-expressions` in `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` by adding type assertions for template literals
- [ ] 2.10 Fix `prefer-promise-reject-errors` in `Identity/src/infrastructure/http/controllers/__tests__/OAuthController.test.ts` by replacing object rejections with Error objects
- [ ] 2.11 Remove unused imports and variables across all affected test files per spec requirements

## Phase 3: Testing/Verification

- [ ] 3.1 Run `bun run lint` in the Identity service directory to verify all 11 linting errors are resolved
- [ ] 3.2 Run `bun test` for all affected test files to ensure no regressions in test behavior
- [ ] 3.3 Verify specific test scenarios from specs: unused imports removal, dynamic delete replacement, unreachable code removal
- [ ] 3.4 Run lint check again after test execution to ensure no new linting errors introduced

## Phase 4: Cleanup/Documentation

- [ ] 4.1 Add JSDoc comments to any new or modified test helper functions or utilities
- [ ] 4.2 Update error messages to be more descriptive where applicable (e.g., in promise rejections)