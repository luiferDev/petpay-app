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

#### Scenario: OAuth provider token validation

- GIVEN an attacker attempting to fake OAuth response
- WHEN the attacker provides invalid or expired provider tokens
- THEN the system SHALL reject the authentication attempt
- AND return an error indicating authentication failure

---

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
| Provider auth failure | 401 | OAUTH_FAILED |
| User previously linked | 409 | PROVIDER_ALREADY_LINKED |
| Rate limited by provider | 429 | PROVIDER_RATE_LIMITED |
| Provider unavailable | 503 | PROVIDER_UNAVAILABLE |
