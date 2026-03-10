# Rate Limiting Specification

## Purpose

This specification defines the rate limiting functionality for the Identity service API endpoints. Rate limiting protects the service from abuse, brute-force attacks, and excessive request volumes while ensuring fair usage for legitimate users.

## Requirements

### Requirement: Rate Limiting Middleware

The system SHALL implement rate limiting middleware that restricts the number of requests a client can make within a specified time window.

#### Scenario: Normal request within limits

- GIVEN a client making requests within the allowed limit
- WHEN the client sends a request to any endpoint
- THEN the request SHALL be processed normally
- AND the response SHALL include rate limit headers

#### Scenario: Request exceeds limit

- GIVEN a client that has exceeded the allowed number of requests
- WHEN the client sends another request
- THEN the system SHALL return HTTP 429 Too Many Requests
- AND the response SHALL include a Retry-After header

---

### Requirement: Endpoint-Specific Limits

The system SHALL apply different rate limits based on the endpoint category.

#### Scenario: Auth endpoint rate limit

- GIVEN a client attempting to access auth endpoints (login, register)
- WHEN the client makes more than 10 requests within 15 minutes
- THEN subsequent requests SHALL be rejected with 429
- AND the client SHALL be informed of the limit

#### Scenario: OAuth endpoint rate limit

- GIVEN a client attempting to access OAuth endpoints
- WHEN the client makes more than 5 requests within 15 minutes
- THEN subsequent requests SHALL be rejected with 429

#### Scenario: General endpoint rate limit

- GIVEN a client accessing general API endpoints
- WHEN the client makes more than 100 requests within 1 minute
- THEN subsequent requests SHALL be rejected with 429

---

### Requirement: Rate Limit Response Headers

The system SHALL include standard rate limit information in response headers.

#### Scenario: Rate limit headers present

- GIVEN a client making a valid request
- WHEN the request is processed
- THEN the response SHALL include:
  - X-RateLimit-Limit: Maximum requests allowed
  - X-RateLimit-Remaining: Requests remaining in window
  - X-RateLimit-Reset: Unix timestamp when the limit resets

#### Scenario: Rate limit exceeded headers

- GIVEN a client that has exceeded their limit
- WHEN the request is rejected
- THEN the response SHALL include:
  - Retry-After: Seconds until the client can retry

---

### Requirement: Rate Limiting Configuration

The system SHALL allow rate limiting to be configured via environment variables.

#### Scenario: Rate limiting disabled

- GIVEN the rate limiting is disabled via configuration
- WHEN clients make requests
- THEN all requests SHALL be processed without rate limiting

#### Scenario: Custom rate limits

- GIVEN custom rate limit values are provided
- WHEN the service starts
- THEN the system SHALL use the custom values
- AND all endpoints SHALL respect the configured limits

---

### Requirement: Rate Limit Storage

The system SHALL store rate limit counters in memory for the current implementation.

#### Scenario: In-memory rate limiting

- GIVEN a single instance deployment
- WHEN rate limits are checked
- THEN the system SHALL use in-memory storage
- AND rate limits SHALL be tracked per IP address

---

## Configuration Requirements

### Requirement: Environment Variables

The system SHALL support the following environment variables for rate limiting:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| RATE_LIMIT_ENABLED | boolean | true | Enable/disable rate limiting |
| RATE_LIMIT_AUTH_MAX | number | 10 | Max requests for auth endpoints |
| RATE_LIMIT_AUTH_WINDOW_MS | number | 900000 | Time window for auth (15 min) |
| RATE_LIMIT_OAUTH_MAX | number | 5 | Max requests for OAuth |
| RATE_LIMIT_OAUTH_WINDOW_MS | number | 900000 | Time window for OAuth (15 min) |
| RATE_LIMIT_GENERAL_MAX | number | 100 | Max requests for general endpoints |
| RATE_LIMIT_GENERAL_WINDOW_MS | number | 60000 | Time window for general (1 min) |

---

## Error Handling

### Requirement: Rate Limit Error Response

The system SHALL return appropriate error responses when rate limits are exceeded.

| Scenario | HTTP Status | Headers | Body |
|----------|-------------|---------|------|
| Limit exceeded | 429 | Retry-After, X-RateLimit-* | Error message |
| Rate limiting disabled | N/A | N/A | Normal response |

---

## Implementation Notes

- Rate limiting SHALL be applied at the middleware level
- Each endpoint category SHALL have its own rate limiter instance
- IP addresses SHALL be used as the identifier for rate limiting
- The implementation SHOULD NOT block legitimate users with reasonable usage
