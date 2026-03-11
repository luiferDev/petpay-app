# Tasks: Fix Linting Errors in Identity Service Application Layer

## Phase 1: Foundation/Infrastructure

- [ ] 1.1 **Add optional type definitions for nullable values** in `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts`
  - Define types for `cookieState` parameter to handle nullish values properly
  - Ensure TypeScript strict mode compatibility for optional strings

- [ ] 1.2 **Import specific error types for type safety** in `Identity/src/application/use-case/auth/RegisterUserUseCase.ts`
  - Replace `error: any` with proper error typing
  - Import PostgreSQL error types or define type guards for database errors

## Phase 2: Core Implementation

### AdminRegistrationStrategy.ts (7 errors)

- [ ] 2.1 **Fix non-null assertion in AdminRegistrationStrategy.ts line 31**
  - Replace `user.id!` with explicit null check before `sendVerificationEmail`
  - Add validation: `if (user.id === undefined) throw new Error('User ID required')`

- [ ] 2.2 **Remove unused imports in AdminRegistrationStrategy.ts**
  - Identify and remove any unused import statements
  - Verify all imports are actually used in the file

### UserRegisterStrategy.ts (7 errors)

- [ ] 2.3 **Fix non-null assertion in ClientRegistrationStrategy line 41**
  - Replace `user.id!` with explicit null check in `applySpecifics` method
  - Add proper validation before sending verification email

- [ ] 2.4 **Fix non-null assertion in ServiceProviderRegistrationStrategy line 67**
  - Replace `user.id!` with explicit null check in `applySpecifics` method
  - Add proper validation before sending verification email

- [ ] 2.5 **Remove unused imports in UserRegisterStrategy.ts**
  - Identify and remove any unused import statements
  - Verify all imports are actually used in the file

### LoginUseCase.ts (4 errors)

- [ ] 2.6 **Fix non-null assertion in LoginUseCase.ts line 68**
  - Replace `user.id!` with explicit null check in response DTO
  - Add validation before constructing the response object

- [ ] 2.7 **Fix explicit boolean expressions in LoginUseCase.ts**
  - Replace implicit truthiness checks with explicit comparisons
  - Example: `if (!user.isVerified)` → `if (user.isVerified === false)`

### RegisterUserUseCase.ts (8 errors)

- [ ] 2.8 **Fix non-null assertion in RegisterUserUseCase.ts line 119**
  - Replace `savedUser.id!` with explicit null check
  - Add validation before constructing the response object

- [ ] 2.9 **Fix error typing in RegisterUserUseCase.ts line 125**
  - Replace `error: any` with proper error typing
  - Implement type guard for PostgreSQL error code checking

- [ ] 2.10 **Fix explicit boolean checks in RegisterUserUseCase.ts**
  - Replace implicit truthiness checks with explicit comparisons
  - Example: `if (savedUser.id === undefined)` (already explicit, verify all checks)

- [ ] 2.11 **Remove unused variables in RegisterUserUseCase.ts**
  - Identify and remove any unused variables
  - Verify variable usage throughout the file

### LinkOAuthProviderUseCase.ts (5 errors)

- [ ] 2.12 **Fix nullish coalescing in LinkOAuthProviderUseCase.ts line 72**
  - Replace `request.cookieState || ''` with `request.cookieState ?? ''`
  - Ensure empty strings are not treated as falsy values

- [ ] 2.13 **Fix explicit boolean checks in LinkOAuthProviderUseCase.ts**
  - Replace implicit truthiness checks with explicit comparisons
  - Example: `if (validationResult.payload != null)` (already explicit, verify all)

### OAuthLoginUseCase.ts (5 errors)

- [ ] 2.14 **Fix nullish coalescing in OAuthLoginUseCase.ts line 98**
  - Replace `request.cookieState || ''` with `request.cookieState ?? ''`
  - Ensure proper handling of null vs empty string

- [ ] 2.15 **Fix non-null assertions in OAuthLoginUseCase.ts lines 136, 143**
  - Replace `user.id!` with explicit null checks
  - Add validation before using user ID in token generation and response

- [ ] 2.16 **Fix type assertions in OAuthLoginUseCase.ts lines 179, 192**
  - Replace `as any` and `as string` with proper type guards
  - Use explicit type checking instead of type assertions

- [ ] 2.17 **Fix explicit boolean checks in OAuthLoginUseCase.ts**
  - Replace implicit truthiness checks with explicit comparisons
  - Example: `if (existingOAuthRecord != null)` (already explicit, verify all)

- [ ] 2.18 **Remove unused imports in OAuthLoginUseCase.ts**
  - Identify and remove any unused import statements
  - Verify all imports are actually used in the file

## Phase 3: Testing/Verification

- [ ] 3.1 **Run lint check on Identity service**
  - Execute `bun run lint` in the Identity directory
  - Verify all 36 linting errors are resolved

- [ ] 3.2 **Run tests for LoginUseCase**
  - Execute `bun test LoginUseCase.test.ts`
  - Verify null check logic doesn't break existing functionality

- [ ] 3.3 **Run tests for RegisterUserUseCase**
  - Execute `bun test RegisterUserUseCase.test.ts`
  - Verify error typing changes don't break error handling

- [ ] 3.4 **Run tests for OAuth use cases**
  - Execute `bun test OAuthLoginUseCase.test.ts`
  - Verify nullish coalescing operator usage works correctly

## Phase 4: Cleanup/Documentation

- [ ] 4.1 **Add JSDoc comments for new validation logic**
  - Document explicit null checks in all modified files
  - Add parameter descriptions for type-safe error handling

- [ ] 4.2 **Update error messages for clarity**
  - Review error messages in modified files
  - Ensure they are descriptive and actionable
