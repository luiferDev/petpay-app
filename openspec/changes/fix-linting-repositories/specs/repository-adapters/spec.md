# Repository Adapters Specification

## Purpose

This specification defines the code quality and linting requirements for database repository adapter implementations in the Identity service. It ensures proper handling of nullable values, type safety, and adherence to TypeScript best practices.

## Requirements

### Requirement: Nullable Value Handling with Nullish Coalescing

The system SHALL use the nullish coalescing operator (`??`) instead of logical OR (`||`) when handling optional or nullable values in repository adapters. This ensures that only `null` or `undefined` values trigger the fallback, not other falsy values like empty strings or `0`.

#### Scenario: Handling optional database field with nullish coalescing

- GIVEN a repository adapter method that retrieves an entity with an optional field
- WHEN the optional field is `null` or `undefined`
- THEN the system MUST use `??` to provide a default value
- AND empty strings (`""`) or `0` MUST NOT trigger the fallback

#### Scenario: Preventing incorrect fallback with logical OR

- GIVEN a repository adapter method that uses `||` for fallback logic
- WHEN a field contains an empty string `""` or `0`
- THEN the system MUST NOT replace it with a default value
- AND the actual value (`""` or `0`) MUST be preserved

### Requirement: Explicit Null Checks Instead of Non-Null Assertions

The system SHALL use explicit null checks instead of non-null assertion operators (`!`) in repository adapters. This prevents runtime errors and makes null handling explicit in the code.

#### Scenario: Checking for null/undefined before accessing properties

- GIVEN a repository adapter method that receives a potentially null value
- WHEN the method needs to access a property of that value
- THEN the system MUST check if the value is null or undefined first
- AND only access the property after confirming the value exists

#### Scenario: Avoiding non-null assertion operator

- GIVEN a repository adapter method that uses `!` to assert a value is not null
- WHEN the value is actually null at runtime
- THEN the system MUST NOT throw a runtime error due to the assertion
- AND the code MUST handle the null case gracefully

### Requirement: Nullable String Handling in Conditionals

The system SHALL properly handle nullable strings in conditional statements, checking for empty strings, null, and undefined values separately when needed.

#### Scenario: Checking for empty strings vs null/undefined

- GIVEN a repository adapter method that checks a string field
- WHEN the field could be empty string, null, or undefined
- THEN the system MUST distinguish between these cases if the logic requires it
- AND use appropriate checks: `field === ""`, `field === null`, `field === undefined`

#### Scenario: Checking for any falsy value vs nullish value

- GIVEN a repository adapter method that needs to check for any absence of value
- WHEN the distinction between empty string and null/undefined matters
- THEN the system MUST use appropriate checks based on the requirement
- AND `??` should be used for nullish coalescing, not `||` for general falsy checks

### Requirement: Interface Definitions with Proper Nullability

The system SHALL define repository interfaces with explicit nullable types where appropriate, using `| null` or optional properties (`?`) to indicate optional values.

#### Scenario: Interface method with optional return value

- GIVEN an interface method that may not find an entity
- WHEN the method signature is defined
- THEN the return type MUST include `| null` or be marked as optional where appropriate
- AND the implementation MUST adhere to this contract

#### Scenario: Interface method parameters with nullable types

- GIVEN an interface method that accepts nullable parameters
- WHEN the method signature is defined
- THEN parameter types MUST explicitly indicate nullability
- AND implementations MUST handle null values correctly

### Requirement: Type Safety in Repository Operations

The system SHALL maintain type safety in all repository operations, ensuring that type assertions are accurate and that the code complies with strict TypeScript linting rules.

#### Scenario: Strict boolean expressions compliance

- GIVEN a repository adapter method with conditional checks
- WHEN the condition involves non-boolean values
- THEN the system MUST explicitly convert to boolean or use appropriate checks
- AND comply with `strict-boolean-expressions` linting rule

#### Scenario: Nullish coalescing operator preference

- GIVEN a repository adapter method that provides fallback values
- WHEN the fallback is intended only for null/undefined
- THEN the system MUST prefer `??` over `||`
- AND comply with `prefer-nullish-coalescing` linting rule

## Implementation Notes

### Key Changes in Affected Files

1. **DrizzleAccountAdapter.ts**: Replace `||` with `??` for optional values
2. **DrizzleUserAdapter.ts**: Replace `!` with explicit null checks
3. **OAuthUserAdapter.ts**: Replace `||` with `??`
4. **IAccountRepository.ts**: Fix interface definitions with proper nullable types

### Linting Rules Addressed

- `strict-boolean-expressions`: Ensures explicit boolean conditions
- `prefer-nullish-coalescing`: Prefers `??` over `||` for null/undefined fallbacks
- Proper type annotations for nullable values

### Backward Compatibility

All changes are syntax-level fixes that maintain the same runtime behavior, ensuring no functional regressions.
