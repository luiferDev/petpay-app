# Delta for Auth - Refresh Token with Redis

## Purpose

This delta spec describes the requirements for implementing JWT refresh token functionality with Redis storage to enable token rotation, revocation, and extended session management.

## ADDED Requirements

### Requirement: Redis Connection Configuration

The system MUST be configurable to connect to a Redis server for refresh token storage.

#### Scenario: Redis configuration is provided

- GIVEN the environment contains valid Redis configuration (REDIS_URL or REDIS_HOST/REDIS_PORT)
- WHEN the Identity service starts
- THEN the system SHALL establish a connection to the Redis server
- AND make Redis available for token storage operations

#### Scenario: Redis connection fails during startup

- GIVEN Redis configuration is provided but connection fails
- WHEN the Identity service starts
- THEN the system MAY log a warning
- AND the service SHALL continue to start (with fallback behavior for token operations)

#### Scenario: Redis not configured

- GIVEN no Redis configuration is provided
- WHEN the Identity service starts
- THEN the system SHALL operate without Redis (stateless refresh tokens as fallback)

---

### Requirement: Refresh Token Storage in Redis

The system SHALL store active refresh tokens in Redis with configurable TTL matching the token expiry.

#### Scenario: User logs in and receives refresh token

- GIVEN a user successfully authenticates via POST /auth/login
- WHEN the LoginUseCase generates tokens
- THEN the system SHALL store the refresh token in Redis with key format `refresh_token:{userId}:{tokenId}`
- AND set the TTL to match REFRESH_TOKEN_EXPIRY configuration

#### Scenario: Refresh token stored with unique ID

- GIVEN a refresh token is being stored
- WHEN the token is generated
- THEN the system SHALL include a unique tokenId (UUID) in the JWT payload
- AND use this tokenId as part of the Redis key for tracking

---

### Requirement: POST /auth/refresh Endpoint

The system SHALL provide an endpoint to exchange a valid refresh token for new access and refresh tokens.

#### Scenario: Valid refresh token exchange

- GIVEN a client sends a POST /auth/refresh request with a valid refresh token
- WHEN the server validates the refresh token signature and verifies it exists in Redis
- THEN the system SHALL verify the token exists in Redis
- AND invalidate the old refresh token (delete from Redis)
- AND generate new access token and refresh token pair
- AND store the new refresh token in Redis with fresh TTL
- AND return the new access token to the client

#### Scenario: Refresh token not found in Redis

- GIVEN a client sends a POST /auth/refresh request with a refresh token
- WHEN the server validates the token but it is not found in Redis
- THEN the system SHALL return 401 Unauthorized
- AND indicate the token has been used or revoked

#### Scenario: Invalid refresh token

- GIVEN a client sends a POST /auth/refresh request with an invalid or malformed refresh token
- WHEN the server attempts to verify the token
- THEN the system SHALL return 401 Unauthorized
- AND indicate invalid credentials

#### Scenario: Refresh token has expired (JWT expired)

- GIVEN a client sends a POST /auth/refresh request with an expired refresh token
- WHEN the server validates the JWT and it fails due to expiration
- THEN the system SHALL return 401 Unauthorized
- AND indicate the token has expired

---

### Requirement: POST /auth/logout Endpoint

The system SHALL provide an endpoint to invalidate a refresh token and log the user out.

#### Scenario: Successful logout

- GIVEN an authenticated client sends a POST /auth/logout request with a refresh token
- WHEN the server validates the refresh token exists in Redis
- THEN the system SHALL delete the refresh token from Redis
- AND return a success response to the client

#### Scenario: Logout with already invalidated token

- GIVEN a client sends a POST /auth/logout request with a token that was already used or deleted
- WHEN the server checks Redis and does not find the token
- THEN the system SHALL return success (idempotent operation)
- AND indicate the session was already terminated

---

### Requirement: Token Rotation

The system SHALL implement token rotation to prevent token replay attacks.

#### Scenario: Token rotation on refresh

- GIVEN a client uses a valid refresh token to get new tokens
- WHEN the refresh request is processed successfully
- THEN the old refresh token SHALL be invalidated (deleted from Redis)
- AND a new refresh token SHALL be generated
- AND the new refresh token SHALL be stored in Redis with fresh TTL

#### Scenario: Used refresh token rejection

- GIVEN a client attempts to reuse a refresh token that has already been exchanged
- WHEN the server checks Redis for the token
- THEN the system SHALL return 401 Unauthorized
- AND indicate the token has been used

---

### Requirement: Redis Service Interface

The system SHALL define an IRedisService interface for Redis operations.

#### Scenario: Redis service stores token

- GIVEN a user ID and refresh token with TTL
- WHEN the RedisService is called to store the token
- THEN the system SHALL use Redis SET with the appropriate key format
- AND set the expiration matching the TTL

#### Scenario: Redis service retrieves token

- GIVEN a user ID and token ID
- WHEN the RedisService is called to retrieve the token
- THEN the system SHALL return the token if it exists
- AND return null if the token does not exist or has expired

#### Scenario: Redis service deletes token

- GIVEN a user ID and token ID
- WHEN the RedisService is called to delete the token
- THEN the system SHALL delete the key from Redis
- AND return success status

---

### Requirement: Refresh Token Include Token ID

The system SHALL include a unique token ID in the refresh token JWT payload.

#### Scenario: Token generation includes token ID

- GIVEN a user is authenticating and needs tokens generated
- WHEN the token provider generates a refresh token
- THEN the refresh token payload SHALL include a tokenId field with a UUID value

---

## MODIFIED Requirements

### Requirement: Token Generation with Token ID

(Previously: Refresh tokens were stateless JWTs with no tracking)

The token generation methods MUST include a unique tokenId in the refresh token payload for Redis tracking.

#### Scenario: Generate tokens for user

- GIVEN a valid User entity
- WHEN the token provider generates tokens
- THEN the access token SHALL NOT include a tokenId
- AND the refresh token SHALL include a tokenId field with a UUID

---

## REMOVED Requirements

None - this change only adds new functionality.

---

## Error Handling Scenarios

### Error: TokenNotFoundError - Refresh token not in Redis

- GIVEN a refresh request where the token is not found in Redis
- WHEN validation is attempted
- THEN throw TokenNotFoundError with message "Refresh token not found or already used"

### Error: InvalidTokenError - Malformed refresh token

- GIVEN a refresh request with a malformed or invalid JWT
- WHEN validation is attempted
- THEN throw InvalidTokenError with message "Invalid refresh token"

### Error: RedisConnectionError - Redis unavailable

- GIVEN a refresh/logout request when Redis is not available
- WHEN the operation is attempted
- THEN the system SHOULD log a warning
- AND if Redis is required, return a service unavailable error
- OR allow fallback to stateless validation if configured

---

## Configuration Requirements

### Redis Configuration Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| REDIS_URL | string | No | - | Full Redis connection URL |
| REDIS_HOST | string | No | localhost | Redis server hostname |
| REDIS_PORT | number | No | 6379 | Redis server port |
| REDIS_PASSWORD | string | No | - | Redis password (if auth required) |
| REDIS_DB | number | No | 0 | Redis database number |

### Token Configuration Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| REFRESH_TOKEN_EXPIRY | string | Yes | 7d | Refresh token expiration |
| ACCESS_TOKEN_EXPIRY | string | Yes | 15m | Access token expiration |