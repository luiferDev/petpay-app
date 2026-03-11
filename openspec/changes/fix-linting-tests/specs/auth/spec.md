# Delta for auth

## ADDED Requirements

### Requirement: Remove Unused Imports in Test Files

The test suite MUST NOT contain unused import declarations to comply with linting rules.

#### Scenario: Unused ITokenService import in LoginUseCase.test

- GIVEN LoginUseCase.test.ts imports `ITokenService` type
- WHEN the linter runs
- THEN the import MUST be removed as it's not used in the test file

#### Scenario: Unused ITokenService import in OAuthLoginUseCase.test

- GIVEN OAuthLoginUseCase.test.ts imports `ITokenService` type
- WHEN the linter runs
- THEN the import MUST be removed as it's not used in the test file

### Requirement: Remove Unused Variables in Test Files

The test suite MUST NOT contain unused variable declarations to comply with linting rules.

#### Scenario: Unused longBcryptHash variable

- GIVEN RegisterUserUseCase.concurrency.test.ts declares `longBcryptHash` variable
- WHEN the linter runs
- THEN the variable declaration MUST be removed as it's not used in the test

#### Scenario: Unused stateManager variable in OAuthController.test

- GIVEN OAuthController.test.ts declares `stateManager` variable in outer scope
- WHEN the linter runs
- THEN the variable declaration MUST be removed as it's not used in the test

### Requirement: Replace Dynamic Delete with Static Property Access

The test suite MUST NOT use dynamic property deletion to comply with linting rules.

#### Scenario: Dynamic delete in OAuthController.test

- GIVEN OAuthController.test.ts uses `delete cookies[name]`
- WHEN the linter runs
- THEN the dynamic delete MUST be replaced with static property access pattern

### Requirement: Remove Unreachable Code

The test suite MUST NOT contain unreachable code to comply with linting rules.

#### Scenario: Duplicate return statement in auth-controller.concurrency.test

- GIVEN auth-controller.concurrency.test.ts contains duplicate `return null` statements
- WHEN the linter runs
- THEN the unreachable code MUST be removed

### Requirement: Fix Template Literal Type Errors

The test suite MUST use type assertions in template literals when values may be undefined.

#### Scenario: Template literals with potentially undefined values

- GIVEN tests contain template literals with values that may be undefined
- WHEN the linter runs
- THEN the test MUST use `${value as string}` type assertions
- AND the template expression MUST compile without type errors

### Requirement: Replace require() with import Statements

The test suite MUST use ES module import syntax instead of CommonJS require().

#### Scenario: Dynamic require in OAuthLoginUseCase.test

- GIVEN OAuthLoginUseCase.test.ts uses `require('crypto')`
- WHEN the linter runs
- THEN the require MUST be replaced with an import statement at the top of the file

## MODIFIED Requirements

### Requirement: Type Safety in Template Literals

The system tests MUST ensure type safety when using template literals.

Previously: Template literals could use potentially undefined values without type checking

Now: Template literals MUST use type assertions (e.g., `${value as string}`) for values that may be undefined

#### Scenario: Template literal with undefined value

- GIVEN a test contains a template literal with a potentially undefined value
- WHEN the test is linted
- THEN the template literal MUST use a type assertion
- AND the expression MUST be valid TypeScript

## REMOVED Requirements

### Requirement: Implicit Any Type Usage in Tests

(Reason: TypeScript strict mode and ts-standard linting rules prohibit implicit any types in test files)

#### Scenario: Previous test patterns

- GIVEN tests used implicit any types for error objects
- WHEN linting with ts-standard
- THEN the linter MUST report `noImplicitAny` errors
- AND the test MUST be updated to use explicit type assertions