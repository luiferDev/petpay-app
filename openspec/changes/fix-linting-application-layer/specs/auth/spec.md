# Delta for Auth Domain

## ADDED Requirements

### Requirement: Explicit Null Checks for User ID

The system SHALL replace non-null assertions (`!`) with explicit null checks for user ID fields in application layer files. This ensures type safety and prevents runtime errors from unexpected null values.

#### Scenario: LoginUseCase handles user ID with explicit null check

- GIVEN a user is successfully authenticated and found in the database
- WHEN the login use case returns the user response
- THEN the system SHALL check that `user.id` is not null or undefined before accessing it
- AND the system SHALL throw an appropriate error if the user ID is missing
- AND the system SHALL include the user ID in the response only when it's validated

#### Scenario: RegisterUserUseCase handles saved user ID with explicit validation

- GIVEN a user is successfully saved to the database
- WHEN the registration use case processes the saved user
- THEN the system SHALL validate that `savedUser.id` exists before using it
- AND the system SHALL throw an error if the user ID is missing
- AND the system SHALL include the validated user ID in the response

### Requirement: Replace Nullish Coalescing Operator for Optional Values

The system SHALL replace the logical OR operator (`||`) with the nullish coalescing operator (`??`) for optional string values to correctly handle `null` vs `empty string` cases.

#### Scenario: OAuthLoginUseCase uses nullish coalescing for cookie state

- GIVEN a OAuth login request with an optional cookie state
- WHEN the cookie state parameter is `null` or `undefined`
- THEN the system SHALL use `??` to default to an empty string
- AND the system SHALL NOT treat an empty string as a falsy value that gets replaced

#### Scenario: LinkOAuthProviderUseCase uses nullish coalescing for error messages

- GIVEN a OAuth linking request with an optional error message
- WHEN the validation result error message is `null` or `undefined`
- THEN the system SHALL use `??` to provide a default error message
- AND the system SHALL maintain proper error handling for all validation failures

### Requirement: Remove Unused Variables and Imports

The system SHALL identify and remove all unused variables and imports to improve code quality and reduce bundle size.

#### Scenario: Unused imports are removed from AdminRegistrationStrategy

- GIVEN the AdminRegistrationStrategy file
- WHEN the linter identifies unused imports
- THEN the system SHALL remove all unused import statements
- AND the system SHALL maintain all required dependencies for functionality

### Requirement: Explicit Boolean Expressions

The system SHALL use explicit boolean expressions in conditionals instead of relying on implicit truthiness checks.

#### Scenario: OAuthLoginUseCase uses explicit conditionals for payload validation

- GIVEN the OAuth state validation logic
- WHEN checking if the validation payload exists
- THEN the system SHALL use explicit `!= null` checks instead of implicit truthiness
- AND the system SHALL maintain the same logical flow with improved type safety

#### Scenario: LoginUseCase uses explicit checks for user verification

- GIVEN the login validation logic
- WHEN checking if a user is verified
- THEN the system SHALL use explicit boolean comparisons
- AND the system SHALL handle edge cases where verification status might be undefined

## MODIFIED Requirements

### Requirement: Error Handling in RegisterUserUseCase

The system SHALL use proper error typing instead of `any` type for caught errors in RegisterUserUseCase.

- **Previously**: Used `error: any` type when catching database errors
- **Now**: Use proper error typing with type guards for database-specific errors

#### Scenario: RegisterUserUseCase handles database errors with proper typing

- GIVEN a database operation fails in RegisterUserUseCase
- WHEN catching the error
- THEN the system SHALL use proper error typing
- AND the system SHALL check for PostgreSQL error codes using type guards
- AND the system SHALL maintain the same error handling logic

### Requirement: Type Safety in User Registration Strategies

The system SHALL ensure type safety when accessing user ID fields in registration strategies.

- **Previously**: Used non-null assertions (`user.id!`) in registration strategies
- **Now**: The user ID is guaranteed to exist after database persistence, but strategies should handle it safely

#### Scenario: AdminRegistrationStrategy handles user ID after persistence

- GIVEN an admin user has been persisted to the database
- WHEN the strategy sends a verification email
- THEN the system SHALL validate that the user ID exists before using it
- AND the system SHALL send the email with the validated user ID

## REMOVED Requirements

### Requirement: Non-Null Assertion Operator Usage

The system SHALL NOT use the TypeScript non-null assertion operator (`!`) to bypass null checks.

- **Reason**: The non-null assertion operator can hide potential runtime errors and reduce code safety. Explicit null checks provide better type safety and error handling.

#### Scenario: Legacy code with non-null assertions

- GIVEN existing code using `value!` syntax
- WHEN refactoring for linting compliance
- THEN the system SHALL replace all non-null assertions with explicit checks
- AND the system SHALL maintain the same runtime behavior with improved type safety

## Coverage Summary

### Files Covered by This Delta Specification
- `Identity/src/application/strategies/registration/AdminRegistrationStrategy.ts`
- `Identity/src/application/strategies/registration/UserRegisterStrategy.ts`
- `Identity/src/application/use-case/auth/LoginUseCase.ts`
- `Identity/src/application/use-case/auth/RegisterUserUseCase.ts`
- `Identity/src/application/use-case/oauth/LinkOAuthProviderUseCase.ts`
- `Identity/src/application/use-case/oauth/OAuthLoginUseCase.ts`

### Total Linting Errors Addressed
- Non-null assertions (`!`): 10 errors
- Unused variables/imports: 2 errors
- `||` operator usage: 3 errors
- Strict boolean expressions: 2 errors
- Type safety improvements: 3 errors

### Test Coverage
All scenarios should be covered by existing unit tests for the affected use cases and strategies. The changes maintain backward compatibility while improving type safety.