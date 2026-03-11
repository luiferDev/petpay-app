# Infrastructure Services Implementation Specification

## Purpose

This specification defines the implementation standards for Identity infrastructure services to ensure type safety, linting compliance, and adherence to `ts-standard` rules. It addresses specific linting errors related to nullish coalescing, strict boolean expressions, and type assertions in critical service files.

## Requirements

### Requirement: Nullish Coalescing Operator Usage

The system MUST use the nullish coalescing operator (`??`) instead of logical OR (`||`) for fallback values when dealing with optional values that might be falsy but valid (e.g., empty string, 0, false).

#### Scenario: JWT Token Provider Role Fallback

- GIVEN a user with an empty roles array or a role that could be falsy
- WHEN generating a token in `JwtTokenProvider.generateTokens()`
- THEN the system MUST use `user.roles[0] ?? Role.CLIENT` instead of `user.roles[0] || Role.CLIENT`
- AND the role fallback MUST correctly handle `undefined` or `null` values

#### Scenario: OAuth Provider Token Refresh Fallback

- GIVEN OAuth token response with potentially missing refresh token
- WHEN processing tokens in `GoogleOAuthProvider.exchangeCodeForTokens()`
- THEN the system MUST use `tokens.refresh_token ?? undefined` instead of logical OR
- AND the fallback MUST correctly handle empty strings if they occur

### Requirement: Strict Boolean Expressions

The system MUST use explicit boolean checks in conditional statements to avoid unintended truthy/falsy evaluations. This applies specifically to configuration checks and nullable value validations.

#### Scenario: Google OAuth Configuration Validation

- GIVEN Google OAuth provider initialization
- WHEN checking if configuration values are present
- THEN the system MUST use explicit checks (e.g., `value !== undefined && value !== null`) rather than `!!value`
- AND the `isProviderConfigured()` function MUST return a strict boolean

#### Scenario: GitHub OAuth Nullable Value Handling

- GIVEN GitHub user profile with potentially null email field
- WHEN validating email existence in `getUserProfile()`
- THEN the system MUST use explicit null checks (e.g., `email !== null`) instead of truthy checks
- AND MUST handle the `null` case by throwing an appropriate error

### Requirement: Type Safety and Assertions

The system MUST avoid `any` types and unsafe type assertions. Type assertions MUST be minimized and used only when necessary with proper type guards or initialization patterns.

#### Scenario: RabbitMQ Connection Initialization

- GIVEN RabbitMQ connection establishment in `RabbitMQEventPublisher`
- WHEN assigning the connection object to class property
- THEN the system MUST NOT use `as unknown as amqp.Connection` if the type is already correct
- AND MUST use proper typing: `this.connection = conn` (assuming `conn` is already `amqp.Connection`)

#### Scenario: RabbitMQ Connection Closure

- GIVEN RabbitMQ connection closure in `close()` method
- WHEN closing the connection
- THEN the system MUST NOT use `as any` type assertion
- AND MUST use proper type checking: `if (this.connection != null) { await this.connection.close() }`

#### Scenario: Error Handler Type Narrowing

- GIVEN error handling in RabbitMQ event publishing
- WHEN catching errors
- THEN the system MUST use `err: unknown` instead of `err: any`
- AND MUST perform type narrowing using `instanceof Error` checks

### Requirement: Configuration Value Safety

The system MUST handle nullable configuration values without non-null assertions (`!`) unless absolutely validated by preceding checks.

#### Scenario: OAuth Provider Constructor Validation

- GIVEN Google or GitHub OAuth provider initialization
- WHEN configuration values are accessed
- THEN the system MUST validate configuration via `isProviderConfigured()` before accessing values
- AND MUST avoid non-null assertions on configuration values that have been validated
- AND MUST throw descriptive errors if configuration is missing despite validation

## Error Handling Specifications

### Configuration Validation Errors

- **Missing Configuration**: If OAuth provider configuration is missing despite `isProviderConfigured()` returning true, throw `ConfigurationError` with specific field name
- **Invalid Type Assertions**: If unsafe type assertions are detected during code review, fail the build with descriptive linting error

### Runtime Error Handling

- **Null Pointer Prevention**: All conditional checks MUST explicitly handle `null` and `undefined` cases
- **Type Safety Violations**: Use TypeScript strict mode to catch type safety violations at compile time

## Testing Requirements

### Linting Tests

- **Static Analysis**: Run `bun run lint` to verify all linting errors are resolved
- **Type Checking**: Run TypeScript compiler to ensure no type errors exist
- **Null Safety**: Verify nullish coalescing operators are used correctly in all fallback scenarios

### Unit Test Coverage

- **JwtTokenProvider**: Test token generation with empty roles array
- **GoogleOAuthProvider**: Test initialization with missing configuration values
- **GitHubOAuthProvider**: Test email handling with null values
- **RabbitMQEventPublisher**: Test connection initialization and closure

### Integration Tests

- **OAuth Flow**: Verify OAuth authentication works with corrected type assertions
- **Event Publishing**: Verify RabbitMQ events publish correctly with proper type handling

## Context7 MCP Guidance Patterns

### Library Documentation Access

When implementing fixes for external library interactions, use Context7 MCP to access up-to-date documentation:

#### Scenario: Accessing jsonwebtoken Documentation

- GIVEN implementation of JWT token generation
- WHEN needing to verify SignOptions type usage
- THEN use Context7 MCP with query "jsonwebtoken SignOptions type definition"
- AND apply correct type annotations based on library documentation

#### Scenario: Accessing amqplib Documentation

- GIVEN implementation of RabbitMQ connection
- WHEN needing to verify Connection type and methods
- THEN use Context7 MCP with query "amqplib Connection interface"
- AND ensure type assertions match library type definitions

### Implementation Workflow

1. **Identify Library**: Determine which external library is involved (jsonwebtoken, amqplib, google-auth-library)
2. **Query Context7**: Use Context7 MCP to get accurate type definitions and usage patterns
3. **Apply Fixes**: Implement fixes based on library documentation and linting rules
4. **Verify**: Run linting and type checking to ensure compliance

## Scenario Coverage

### Happy Paths

1. **JwtTokenProvider** generates tokens correctly with nullish coalescing
2. **GoogleOAuthProvider** initializes successfully with strict boolean checks
3. **GitHubOAuthProvider** handles null email values correctly
4. **RabbitMQEventPublisher** connects and publishes events with proper typing

### Edge Cases

1. **Empty Roles Array**: JWT token generation with empty roles uses default role
2. **Missing OAuth Configuration**: Provider initialization fails with descriptive error
3. **Null Email in GitHub**: getUserProfile throws error for missing email
4. **RabbitMQ Connection Failure**: Event publishing gracefully handles connection errors

### Error States

1. **Configuration Validation**: Missing config fields throw specific errors
2. **Type Safety Violations**: Linting fails if unsafe assertions remain
3. **Connection Closure**: Null connection handled without type assertion errors
