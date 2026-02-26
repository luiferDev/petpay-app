# OAuth Authentication Specification

## Purpose

This specification defines the OAuth2/Social Login functionality for the Identity service. It enables users to register and authenticate using their Google or GitHub accounts, providing a seamless onboarding experience while maintaining security standards.

## Requirements

### Requirement: Google OAuth Login

The system SHALL support user registration and authentication via Google OAuth2. Users who authenticate through Google MUST be created in the system with their Google-provided email marked as verified.

#### Scenario: New user registers with Google

- GIVEN a user with a valid Google account
- WHEN the user initiates OAuth login with Google and grants consent
- THEN the system SHALL create a new user record with the Google email
- AND the user email SHALL be marked as verified
- AND the user OAuth provider record SHALL be linked to the user
- AND the system SHALL return a valid JWT token

#### Scenario: Existing user links Google account

- GIVEN an existing user who previously registered with email/password
- WHEN the user initiates OAuth login with Google using the same email
- THEN the system SHALL link the Google provider to the existing user
- AND the user email SHALL remain verified (if already verified)
- AND the system SHALL return a valid JWT token

#### Scenario: Returning Google user logs in

- GIVEN a user who previously registered via Google
- WHEN the user initiates OAuth login with Google
- THEN the system SHALL find the existing user by Google provider
- AND the system SHALL return a valid JWT token

---

### Requirement: GitHub OAuth Login

The system SHALL support user registration and authentication via GitHub OAuth2. Users who authenticate through GitHub MUST be created in the system with their GitHub-provided email.

#### Scenario: New user registers with GitHub

- GIVEN a user with a valid GitHub account
- WHEN the user initiates OAuth login with GitHub and grants consent
- THEN the system SHALL create a new user record with the GitHub email
- AND the user OAuth provider record SHALL be linked to the user
- AND the system SHALL return a valid JWT token

#### Scenario: Returning GitHub user logs in

- GIVEN a user who previously registered via GitHub
- WHEN the user initiates OAuth login with GitHub
- THEN the system SHALL find the existing user by GitHub provider
- AND the system SHALL return a valid JWT token

---

### Requirement: OAuth Security

The system SHALL implement OAuth security best practices to prevent common attacks.

#### Scenario: CSRF attack prevention

- GIVEN a malicious site attempting to initiate OAuth flow
- WHEN the attacker tries to forge a request without valid state
- THEN the system SHALL reject the request
- AND return an error indicating invalid state parameter

#### Scenario: OAuth callback with valid signed state

- GIVEN the user returns from OAuth provider with a valid signed state
- WHEN the callback endpoint validates the state from cookie and query parameter
- THEN the system verifies the HMAC signature matches
- AND verifies the timestamp is within 10 minutes (600000ms)
- AND clears the oauth_state cookie after successful validation
- AND proceeds with the OAuth token exchange

#### Scenario: OAuth callback with tampered state

- GIVEN the user returns from OAuth provider with a tampered state parameter
- WHEN the callback endpoint validates the state
- THEN the system rejects the request with OAuthInvalidStateError
- AND does NOT proceed with token exchange

#### Scenario: OAuth callback with expired state

- GIVEN the user returns from OAuth provider after more than 10 minutes
- WHEN the callback endpoint validates the state
- THEN the system rejects the request with OAuthInvalidStateError indicating state expired
- AND does NOT proceed with token exchange

#### Scenario: OAuth provider token validation

- GIVEN an attacker attempting to fake OAuth response
- WHEN the attacker provides invalid or expired provider tokens
- THEN the system SHALL reject the authentication attempt
- AND return an error indicating authentication failure

---

### Requirement: Cryptographically Signed OAuth State

The OAuth state parameter MUST be cryptographically signed using HMAC-SHA256 to prevent CSRF attacks.

The system SHALL generate OAuth state in the format `{timestamp}:{randomBytes}:{signature}` where:
- `timestamp` is Unix epoch time in milliseconds
- `randomBytes` is at least 16 bytes of cryptographically secure random data
- `signature` is HMAC-SHA256 of `{timestamp}:{randomBytes}` signed with `OAUTH_STATE_SECRET`

#### Scenario: User initiates OAuth login flow

- GIVEN an authenticated user or unauthenticated user visits the login page
- WHEN the user clicks "Login with {provider}" (Google or GitHub)
- THEN the system generates a cryptographically signed state
- AND stores the state in an encrypted HTTP-only cookie named `oauth_state`
- AND redirects the user to the OAuth provider with the state as a query parameter

#### Scenario: User links OAuth provider to existing account

- GIVEN an authenticated user initiates linking an OAuth provider
- WHEN the user clicks "Connect {provider}" in account settings
- THEN the system generates a cryptographically signed state for linking
- AND stores it in the same encrypted cookie
- AND validates it the same way on callback

---

### Requirement: Encrypted Cookie Storage

The OAuth state MUST be stored in an encrypted HTTP-only cookie to bind it to the user's browser session.

The system SHALL use cookie encryption with the following attributes:
- `HttpOnly`: MUST be set to prevent XSS access
- `Secure`: MUST be set in production (HTTPS only)
- `SameSite`: SHOULD be set to "lax" for better UX
- `Max-Age`: MUST be set to 600 seconds (10 minutes)

#### Scenario: Cookie is set on OAuth initiate

- GIVEN the OAuth initiate endpoint is called
- WHEN the state is generated and signed
- THEN the system sets the `oauth_state` cookie with the signed state value
- AND includes encryption if configured

---

### Requirement: State Validation in OAuthLoginUseCase

The OAuthLoginUseCase MUST validate the cryptographically signed state parameter, not just check length.

#### Scenario: State validation on OAuth callback

- GIVEN the OAuth callback receives code and state from the provider
- WHEN OAuthLoginUseCase.execute() is called with the state
- THEN the system validates:
  - The state is present and not empty
  - The state contains all required parts (timestamp:random:signature)
  - The HMAC signature is valid
  - The timestamp is within the allowed window (10 minutes)

#### Scenario: Invalid state format rejected

- GIVEN the OAuth callback receives a state with invalid format
- WHEN OAuthLoginUseCase.execute() is called
- THEN the system throws OAuthInvalidStateError with message indicating invalid format

---

## OAuth Error Scenarios

### Error: OAuthInvalidStateError - Invalid Signature

- GIVEN the OAuth callback with a state that has an invalid HMAC signature
- WHEN validation is attempted
- THEN throw OAuthInvalidStateError with message "Invalid OAuth state: signature mismatch"

### Error: OAuthInvalidStateError - Expired State

- GIVEN the OAuth callback with a state older than 10 minutes
- WHEN validation is attempted
- THEN throw OAuthInvalidStateError with message "Invalid OAuth state: state expired"

### Error: OAuthInvalidStateError - Missing Cookie

- GIVEN the OAuth callback with a state parameter but no matching cookie
- WHEN validation is attempted
- THEN throw OAuthInvalidStateError with message "Invalid OAuth state: cookie missing"

### Requirement: OAuth User Data Handling

The system SHALL handle OAuth provider user data according to privacy principles.

#### Scenario: OAuth user requests account deletion

- GIVEN an authenticated OAuth user
- WHEN the user requests account deletion
- THEN the system SHALL delete the user record
- AND delete all associated OAuth provider records

#### Scenario: OAuth returns insufficient permissions

- GIVEN a user initiating OAuth login
- WHEN the OAuth provider returns an error due to insufficient permissions
- THEN the system SHALL reject the authentication attempt
- AND return an error indicating permission denied

---

### Requirement: Multiple OAuth Provider Linking

The system SHOULD allow a single user to link multiple OAuth providers.

#### Scenario: User links Google after GitHub login

- GIVEN an authenticated user who logged in via GitHub
- WHEN the user initiates OAuth login with Google using the same email
- THEN the system SHALL link Google provider to the existing user
- AND the user SHALL be able to login with either provider

---

## Database Requirements

### Requirement: OAuth Provider Schema

The system SHALL maintain a `user_oauth_providers` table with the following fields:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| userId | UUID | Foreign Key → users.id | Reference to user |
| provider | VARCHAR(50) | NOT NULL | OAuth provider (google, github) |
| providerUserId | VARCHAR(255) | NOT NULL, Unique | Provider's user ID |
| accessToken | TEXT | Encrypted | Provider access token |
| refreshToken | TEXT | Nullable, Encrypted | Provider refresh token |
| expiresAt | TIMESTAMP | Nullable | Token expiration |
| createdAt | TIMESTAMP | NOT NULL | Record creation time |
| updatedAt | TIMESTAMP | NOT NULL | Last update time |

The combination of (userId, provider) MUST be unique.
The combination of (provider, providerUserId) MUST be unique.

---

## API Requirements

### Requirement: OAuth Endpoints

The system SHALL provide the following OAuth endpoints:

#### GET /auth/oauth/:provider/initiate

- Initiates OAuth flow with the specified provider
- Provider MUST be one of: google, github
- Response: Redirect to provider's OAuth consent page with state parameter

#### GET /auth/oauth/:provider/callback

- Handles OAuth callback from provider
- Query params MUST include: code, state
- Response: JWT token in HTTP-only cookie + redirect to frontend

#### POST /auth/oauth/:provider/link

- Links OAuth provider to currently authenticated user
- Requires existing JWT authentication
- Response: Success message with linked provider info

---

## Error Handling

### Requirement: OAuth Error Responses

The system SHALL return appropriate HTTP status codes for OAuth errors:

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Invalid provider | 400 | INVALID_PROVIDER |
| CSRF/state mismatch | 400 | INVALID_STATE |
| Invalid OAuth signature | 400 | INVALID_STATE |
| OAuth state expired | 400 | INVALID_STATE |
| OAuth cookie missing | 400 | INVALID_STATE |
| Provider auth failure | 401 | OAUTH_FAILED |
| User previously linked | 409 | PROVIDER_ALREADY_LINKED |
| Rate limited by provider | 429 | PROVIDER_RATE_LIMITED |
| Provider unavailable | 503 | PROVIDER_UNAVAILABLE |
