# Delta for OAuth State Validation

## ADDED Requirements

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

### Requirement: Account Linking Uses Same Validation

The account linking flow for OAuth providers MUST use the same cryptographically signed state validation.

#### Scenario: User links OAuth provider to existing account

- GIVEN an authenticated user initiates linking an OAuth provider
- WHEN the user clicks "Connect {provider}" in account settings
- THEN the system generates a cryptographically signed state for linking
- AND stores it in the same encrypted cookie
- AND validates it the same way on callback

## MODIFIED Requirements

### Requirement: State Validation in OAuthLoginUseCase

The OAuthLoginUseCase MUST validate the cryptographically signed state parameter, not just check length.

(Previously: State was validated only by checking `state.length >= 16`)

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

## REMOVED Requirements

### Requirement: Simple Length-Based State Validation

The simple length check (`state.length >= 16`) is REMOVED.

(Reason: This weak validation is replaced with HMAC-signed state validation)

## ADDED Error Scenarios

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
