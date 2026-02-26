# Delta for Testing - Identity Service

## Purpose

This delta specification defines the test coverage requirements for the Identity service. It specifies what MUST be tested, the testing approach, and acceptance criteria for test quality.

## ADDED Requirements

### Requirement: Unit Tests for RegisterUserUseCase

The system SHALL have unit tests for RegisterUserUseCase that verify all registration flows.

#### Scenario: Successful user registration with email/password

- GIVEN valid registration input (email, password, name)
- WHEN RegisterUserUseCase.execute() is called
- THEN it SHALL return a user object with generated ID
- AND the password SHALL be hashed using bcrypt
- AND the user SHALL be persisted to the database

#### Scenario: Registration with duplicate email

- GIVEN a user attempts to register with an email that already exists
- WHEN RegisterUserUseCase.execute() is called
- THEN it SHALL throw UserAlreadyExistsError
- AND no user SHALL be created

#### Scenario: Registration with invalid email format

- GIVEN invalid email input (e.g., "not-an-email")
- WHEN RegisterUserUseCase.execute() is called
- THEN it SHALL throw ValidationError
- AND no user SHALL be created

#### Scenario: Registration with weak password

- GIVEN a password that does not meet strength requirements
- WHEN RegisterUserUseCase.execute() is called
- THEN it SHALL throw ValidationError
- AND no user SHALL be created

---

### Requirement: Unit Tests for LoginUseCase

The system SHALL have unit tests for LoginUseCase that verify authentication flows.

#### Scenario: Successful login with correct credentials

- GIVEN valid email and password
- WHEN LoginUseCase.execute() is called
- THEN it SHALL return a valid JWT token
- AND return user information

#### Scenario: Login with incorrect password

- GIVEN valid email but incorrect password
- WHEN LoginUseCase.execute() is called
- THEN it SHALL throw InvalidCredentialsError

#### Scenario: Login with non-existent email

- GIVEN an email that does not exist in the system
- WHEN LoginUseCase.execute() is called
- THEN it SHALL throw InvalidCredentialsError

---

### Requirement: Unit Tests for AuthController

The system SHALL have unit tests for AuthController that verify HTTP request/response handling.

#### Scenario: POST /auth/register returns 201 on success

- GIVEN valid registration request body
- WHEN AuthController.register() is called
- THEN it SHALL return HTTP 201 with user data
- AND include a JWT token in the response

#### Scenario: POST /auth/register returns 400 on validation error

- GIVEN invalid registration request body
- WHEN AuthController.register() is called
- THEN it SHALL return HTTP 400 with validation errors

#### Scenario: POST /auth/login returns 200 on success

- GIVEN valid login credentials
- WHEN AuthController.login() is called
- THEN it SHALL return HTTP 200 with JWT token

#### Scenario: POST /auth/login returns 401 on invalid credentials

- GIVEN invalid login credentials
- WHEN AuthController.login() is called
- THEN it SHALL return HTTP 401 with error message

---

### Requirement: Unit Tests for Registration Strategies

The system SHALL have unit tests for all registration strategies.

#### Scenario: UserRegisterStrategy creates regular user

- GIVEN valid registration input
- WHEN UserRegisterStrategy.execute() is called
- THEN it SHALL create a user with role "user"

#### Scenario: ServiceProviderRegistrationStrategy creates service provider

- GIVEN valid registration input with service provider flag
- WHEN ServiceProviderRegistrationStrategy.execute() is called
- THEN it SHALL create a user with role "service_provider"

#### Scenario: AdminRegistrationStrategy creates admin user

- GIVEN valid registration input with admin flag
- WHEN AdminRegistrationStrategy.execute() is called
- THEN it SHALL create a user with role "admin"

---

### Requirement: Unit Tests for JwtTokenProvider

The system SHALL have unit tests for JwtTokenProvider that verify token generation and validation.

#### Scenario: Generate valid JWT token

- GIVEN valid user payload
- WHEN JwtTokenProvider.generateToken() is called
- THEN it SHALL return a valid JWT string
- AND the token SHALL contain the user ID

#### Scenario: Verify valid token

- GIVEN a valid JWT token
- WHEN JwtTokenProvider.verifyToken() is called
- THEN it SHALL return the decoded payload

#### Scenario: Reject expired token

- GIVEN an expired JWT token
- WHEN JwtTokenProvider.verifyToken() is called
- THEN it SHALL throw TokenExpiredError

#### Scenario: Reject invalid token

- GIVEN an invalid/malformed JWT token
- WHEN JwtTokenProvider.verifyToken() is called
- THEN it SHALL throw InvalidTokenError

---

### Requirement: Unit Tests for Auth Middleware

The system SHALL have unit tests for authentication middleware.

#### Scenario: Auth middleware allows valid token

- GIVEN a request with valid Authorization header
- WHEN authMiddleware() is called
- THEN it SHALL call next()
- AND attach user to request object

#### Scenario: Auth middleware rejects missing token

- GIVEN a request without Authorization header
- WHEN authMiddleware() is called
- THEN it SHALL return 401 Unauthorized
- AND NOT call next()

#### Scenario: Auth middleware rejects invalid token

- GIVEN a request with invalid Authorization header
- WHEN authMiddleware() is called
- THEN it SHALL return 401 Unauthorized

---

### Requirement: Unit Tests for Validation Middleware

The system SHALL have unit tests for validation middleware.

#### Scenario: Validation middleware passes valid request

- GIVEN a request with valid body matching schema
- WHEN validationMiddleware() is called
- THEN it SHALL call next()

#### Scenario: Validation middleware rejects invalid request

- GIVEN a request with invalid body
- WHEN validationMiddleware() is called
- THEN it SHALL return 400 Bad Request
- AND include validation error details

---

### Requirement: Unit Tests for Error Handler Middleware

The system SHALL have unit tests for error handler middleware.

#### Scenario: Error handler returns formatted error response

- GIVEN an error with status code and message
- WHEN errorHandler() is called
- THEN it SHALL return JSON with error code and message
- AND set appropriate HTTP status code

#### Scenario: Error handler handles DomainError

- GIVEN a DomainError with suggestedHttpCode
- WHEN errorHandler() is called
- THEN it SHALL use the suggestedHttpCode for response

---

### Requirement: Unit Tests for User Entity

The system SHALL have unit tests for User entity validation and methods.

#### Scenario: User entity validates email format

- GIVEN an invalid email address
- WHEN new User() is created with that email
- THEN it SHALL throw ValidationError

#### Scenario: User entity validates password requirements

- GIVEN a weak password
- WHEN new User() is created with that password
- THEN it SHALL throw ValidationError

---

### Requirement: Integration Tests for Authentication Flow

The system SHALL have integration tests covering the complete authentication flow.

#### Scenario: Complete registration → login → token refresh flow

- GIVEN a new user registers with email/password
- WHEN they successfully register, then login, then refresh token
- THEN all operations SHALL succeed
- AND the final token SHALL be valid for authenticated requests

---

### Requirement: Test Coverage Requirements

The system SHALL achieve minimum code coverage thresholds.

#### Scenario: Coverage measurement

- GIVEN all unit tests are executed
- WHEN coverage is measured
- THEN use cases SHALL achieve at least 70% line coverage
- AND services SHALL achieve at least 70% line coverage
- AND controllers SHALL achieve at least 70% line coverage

---

### Requirement: Test Execution

All tests SHALL be executable via the test runner.

#### Scenario: All tests pass

- GIVEN all test files are present
- WHEN `bun test` is executed
- THEN all tests SHALL pass
- AND the exit code SHALL be 0

---

## Test Quality Standards

### Requirement: Test Naming

Tests SHALL use descriptive names following the pattern: `should {expected behavior} when {condition}`.

### Requirement: Test Independence

Tests SHALL NOT depend on execution order and SHALL clean up any created state.

### Requirement: Mock Usage

External dependencies (JWT, email service, OAuth providers) SHALL be mocked using bun:mock.

### Requirement: Test Execution Speed

Individual tests SHALL complete in under 100ms to maintain fast feedback loops.
