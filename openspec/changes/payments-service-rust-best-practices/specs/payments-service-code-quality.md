# Delta for payments-service-code-quality

## Purpose

This spec defines the code quality improvements required for the payments-service Rust microservice, addressing N+1 database queries, unsafe error handling (unwrap/panic), missing clippy configuration, and handler implementation.

## ADDED Requirements

### Requirement: N+1 Query Elimination

The payment repository MUST use database-level filtering instead of loading all records and filtering in memory.

#### Scenario: Find payment by order ID

- GIVEN a payment exists in the database with order_id "order-123"
- WHEN `find_by_order_id("order-123")` is called
- THEN the query MUST filter by `order_id` at the database level
- AND only the matching payment(s) SHALL be returned

#### Scenario: Find payments by customer ID

- GIVEN multiple payments exist in the database for customer "customer-456"
- WHEN `find_by_customer("customer-456")` is called
- THEN the query MUST filter by `customer_id` at the database level
- AND only payments for that customer SHALL be returned

#### Scenario: No matching payment

- GIVEN no payment exists with order_id "nonexistent"
- WHEN `find_by_order_id("nonexistent")` is called
- THEN the query MUST return None
- AND MUST NOT load all payments to filter in memory

### Requirement: Error Handling with Proper Result Types

The main.rs file MUST NOT use `.unwrap()` or `.expect()` for non-critical operations. Error handling SHALL use proper Result types and the `?` operator.

#### Scenario: Configuration loading fails

- GIVEN environment variables are missing or invalid
- WHEN the application starts
- THEN the error MUST be propagated with a meaningful message
- AND the application MUST NOT panic

#### Scenario: Database connection fails

- GIVEN the database server is unavailable
- WHEN the application starts
- THEN the error MUST be propagated with a descriptive message
- AND the application MUST NOT panic

#### Scenario: Server binding fails

- GIVEN the port is already in use
- WHEN the application attempts to bind
- THEN the error MUST be propagated
- AND the application MUST NOT panic

#### Scenario: HTTP handler error mapping

- GIVEN an application command/query returns an error
- WHEN the handler processes the error
- THEN the error MUST be mapped to an appropriate HTTP status code
- AND the response MUST NOT use `.unwrap_or()` with a fallback

### Requirement: Clippy Configuration

The project MUST include clippy configuration in Cargo.toml with appropriate lints.

#### Scenario: Clippy runs without configuration

- GIVEN clippy is run without configuration
- WHEN `cargo clippy` is executed
- THEN warnings about unsafe code patterns MAY appear

#### Scenario: Clippy runs with configuration

- GIVEN clippy configuration is added to Cargo.toml
- WHEN `cargo clippy` is executed
- THEN unsafe code patterns MUST be caught
- AND the build MUST fail if critical lints are violated

### Requirement: HTTP Handler Implementation

HTTP handlers MUST be implemented in the infrastructure layer (`src/infrastructure/http/handlers/`) and properly delegate to the application layer.

#### Scenario: Create payment handler

- GIVEN a valid CreatePaymentRequest is received
- WHEN the create_payment handler is called
- THEN it MUST delegate to the application command
- AND return the appropriate response

#### Scenario: Get payment handler

- GIVEN a payment ID is provided
- WHEN the get_payment handler is called
- THEN it MUST delegate to the application query
- AND return the payment or 404 error

#### Scenario: List payments handler

- GIVEN a request for payment list
- WHEN the list_payments handler is called
- THEN it MUST delegate to the application query
- AND return the list of payments

#### Scenario: Invoice handlers

- GIVEN requests for invoice operations
- WHEN invoice handlers are called (get, list, download PDF)
- THEN each MUST delegate to the appropriate application query

#### Scenario: Coupon handlers

- GIVEN requests for coupon validation/application
- WHEN coupon handlers are called (validate, apply)
- THEN each MUST delegate to the appropriate application command

## MODIFIED Requirements

### Requirement: Payment Repository Interface

The payment repository implementation MAY be modified to fix the N+1 query issue.

(Previously: Used `.all()` followed by in-memory filtering)

## REMOVED Requirements

### Requirement: Inline Handlers in main.rs

The inline handler implementations in main.rs SHOULD be removed after handlers are properly implemented in the infrastructure layer.

(Reason: Handlers belong in the infrastructure layer per hexagonal architecture)

## Implementation Notes

- The N+1 fix uses SeaORM's `.filter()` method: `PaymentEntity::find().filter(PaymentColumn::OrderId.eq(order_id))`
- Error handling follows the pattern from `rust-expert-best-practices-code-review/rules/avoid-panic.md`
- Clippy config follows standard Rust linting practices
- Handlers use the thin handler pattern: extract state, delegate to application layer, map errors to HTTP status codes
