# Delta for Auth

## ADDED Requirements

### Requirement: Advisory Locks for Email Verification

The system SHALL implement PostgreSQL advisory locks for email verification to prevent concurrent verification attempts for the same email/token. The lock key MUST be derived deterministically from the verification token or email.

#### Scenario: Concurrent email verification attempts

- GIVEN multiple requests attempt to verify the same email token simultaneously
- WHEN the first request acquires the advisory lock
- THEN subsequent requests SHALL wait for the lock or timeout
- AND only the first request SHALL proceed with verification
- AND subsequent requests SHALL return a conflict error if the token is already verified

#### Scenario: Lock timeout handling

- GIVEN a verification request acquires an advisory lock
- WHEN the verification process takes longer than expected
- THEN the system SHALL implement a lock timeout to prevent indefinite blocking
- AND if the timeout is exceeded, the request SHALL fail gracefully

## MODIFIED Requirements

### Requirement: Email Verification Endpoint

The system SHALL use advisory locks to serialize email verification attempts for the same token/email.

Previously: Email verification endpoints processed requests without concurrency control.

#### Scenario: Serialized verification processing

- GIVEN two requests arrive for the same verification token
- WHEN the first request starts verification
- THEN the second request SHALL wait for the first to complete
- AND the system SHALL prevent race conditions where both requests mark the email as verified

## REMOVED Requirements

### Requirement: Stateless Email Verification

(Reason: Stateless verification is susceptible to race conditions under concurrent load. Advisory locks are required to ensure consistency.)

The system SHALL NOT process email verification requests without concurrency control.
