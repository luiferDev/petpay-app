# Tasks: Payment & Invoice Microservice

## Phase 1: Infrastructure Setup

- [x] 1.1 Create `payments-service/` directory structure
- [x] 1.2 Create `payments-service/Cargo.toml` with dependencies (axum, sea-orm, tokio, etc.)
- [x] 1.3 Create `payments-service/Dockerfile`
- [x] 1.4 Create `payments-service/.env.example` with environment variables template
- [x] 1.5 Create `payments-service/src/main.rs` with basic Axum server setup
- [x] 1.6 Create `payments-service/src/lib.rs` as library root
- [x] 1.7 Set up SeaORM database connection in `payments-service/src/infrastructure/database/mod.rs`
- [x] 1.8 Create database migrations for payments, invoices, coupons tables
- [x] 1.9 Verify project compiles with `cargo build`
- [x] 1.10 Add payments service to `docker-compose.yml` (port 8083)
- [x] 1.11 Add payments routes to `krakend/krakend.json`

## Phase 2: Domain Layer

- [x] 2.1 Create `payments-service/src/domain/mod.rs` module
- [x] 2.2 Create Payment entity in `payments-service/src/domain/entities/payment.rs`
- [x] 2.3 Create PaymentStatus enum in `payments-service/src/domain/entities/payment.rs`
- [x] 2.4 Create PaymentMethod enum in `payments-service/src/domain/entities/payment.rs`
- [x] 2.5 Create Invoice entity in `payments-service/src/domain/entities/invoice.rs`
- [x] 2.6 Create InvoiceStatus enum in `payments-service/src/domain/entities/invoice.rs`
- [x] 2.7 Create InvoiceItem entity in `payments-service/src/domain/entities/invoice.rs`
- [x] 2.8 Create Coupon entity in `payments-service/src/domain/entities/coupon.rs`
- [x] 2.9 Create DiscountType enum in `payments-service/src/domain/entities/coupon.rs`
- [x] 2.10 Create AppliedCoupon entity in `payments-service/src/domain/entities/coupon.rs`
- [x] 2.11 Create domain errors in `payments-service/src/domain/errors.rs`
- [ ] 2.12 Write unit tests for Payment entity validation
- [ ] 2.13 Write unit tests for Invoice entity calculation logic

## Phase 3: Ports (Interfaces/Traits)

- [x] 3.1 Create `payments-service/src/ports/mod.rs` module
- [x] 3.2 Create PaymentRepository trait in `payments-service/src/ports/repository/payment_repository.rs`
- [x] 3.3 Create InvoiceRepository trait in `payments-service/src/ports/repository/invoice_repository.rs`
- [x] 3.4 Create CouponRepository trait in `payments-service/src/ports/repository/coupon_repository.rs`
- [x] 3.5 Create PaymentProvider trait in `payments-service/src/ports/services/payment_provider.rs`
- [x] 3.6 Create EmailSender trait in `payments-service/src/ports/services/email_sender.rs`
- [x] 3.7 Create OrderValidator trait in `payments-service/src/ports/services/order_validator.rs`
- [ ] 3.8 Write unit tests for repository trait interfaces
- [ ] 3.9 Write unit tests for service trait interfaces

## Phase 4: Application Layer (Commands & Queries)

- [x] 4.1 Create `payments-service/src/application/mod.rs` module
- [x] 4.2 Create DTOs in `payments-service/src/application/dto/create_payment_request.rs`
- [x] 4.3 Create DTOs in `payments-service/src/application/dto/payment_response.rs`
- [x] 4.4 Create DTOs in `payments-service/src/application/dto/invoice_response.rs`
- [x] 4.5 Create DTOs in `payments-service/src/application/dto/coupon_request.rs`
- [x] 4.6 Create ProcessPaymentCommand in `payments-service/src/application/commands/process_payment.rs`
- [x] 4.7 Create RefundPaymentCommand in `payments-service/src/application/commands/refund_payment.rs`
- [x] 4.8 Create ValidateCouponCommand in `payments-service/src/application/commands/validate_coupon.rs`
- [x] 4.9 Create ApplyCouponCommand in `payments-service/src/application/commands/apply_coupon.rs`
- [x] 4.10 Create GetPaymentQuery in `payments-service/src/application/queries/get_payment.rs`
- [x] 4.11 Create ListPaymentsQuery in `payments-service/src/application/queries/list_payments.rs`
- [x] 4.12 Create GetInvoiceQuery in `payments-service/src/application/queries/get_invoice.rs`
- [x] 4.13 Create ListInvoicesQuery in `payments-service/src/application/queries/list_invoices.rs`
- [x] 4.14 Create GetInvoicePdfQuery in `payments-service/src/application/queries/get_invoice_pdf.rs`
- [ ] 4.15 Write unit tests for ProcessPaymentCommand
- [ ] 4.16 Write unit tests for ValidateCouponCommand

## Phase 5: Infrastructure Implementation

- [x] 5.1 Create `payments-service/src/infrastructure/mod.rs` module
- [x] 5.2 Implement SeaORM models in `payments-service/src/infrastructure/database/models/payment_model.rs`
- [x] 5.3 Implement SeaORM models in `payments-service/src/infrastructure/database/models/invoice_model.rs`
- [x] 5.4 Implement SeaORM models in `payments-service/src/infrastructure/database/models/coupon_model.rs`
- [x] 5.5 Implement PaymentRepository in `payments-service/src/infrastructure/database/repositories/payment_repository.rs`
- [x] 5.6 Implement InvoiceRepository in `payments-service/src/infrastructure/database/repositories/invoice_repository.rs`
- [x] 5.7 Implement CouponRepository in `payments-service/src/infrastructure/database/repositories/coupon_repository.rs`
- [x] 5.8 Implement StripePaymentProvider in `payments-service/src/infrastructure/payment/stripe_provider.rs`
- [x] 5.9 Implement PayPalPaymentProvider in `payments-service/src/infrastructure/payment/paypal_provider.rs`
- [x] 5.10 Create PDF generator in `payments-service/src/infrastructure/pdf/mod.rs`
- [x] 5.11 Create IdentityEmailClient in `payments-service/src/infrastructure/email/identity_client.rs`
- [x] 5.12 Create MarketplaceOrderValidator in `payments-service/src/infrastructure/validators/marketplace_validator.rs`
- [ ] 5.13 Write integration tests for PaymentRepository with testcontainer
- [ ] 5.14 Write integration tests for InvoiceRepository with testcontainer

## Phase 6: HTTP Layer

- [x] 6.1 Create `payments-service/src/infrastructure/http/mod.rs` with router setup
- [x] 6.2 Create payment handler in `payments-service/src/infrastructure/http/handlers/payment_handler.rs`
- [x] 6.3 Create invoice handler in `payments-service/src/infrastructure/http/handlers/invoice_handler.rs`
- [x] 6.4 Create coupon handler in `payments-service/src/infrastructure/http/handlers/coupon_handler.rs`
- [x] 6.5 Add JWT authentication middleware in `payments-service/src/infrastructure/http/middleware/auth.rs`
- [x] 6.6 Add request validation in `payments-service/src/infrastructure/http/middleware/validation.rs`
- [x] 6.7 Add error handling middleware in `payments-service/src/infrastructure/http/middleware/error_handler.rs`
- [x] 6.8 Add health check endpoint in `payments-service/src/infrastructure/http/handlers/health.rs`
- [x] 6.9 Configure CORS in `payments-service/src/infrastructure/http/mod.rs`
- [x] 6.10 Wire up all dependencies in `payments-service/src/main.rs`
- [ ] 6.11 Write integration tests for POST /api/v1/payments endpoint
- [ ] 6.12 Write integration tests for GET /api/v1/payments/:id endpoint

## Phase 7: Identity Service Integration

- [x] 7.1 Add sendInvoice method to `Identity/src/application/ports/IEmailService.ts`
- [x] 7.2 Implement sendInvoice in `Identity/src/infrastructure/services/NodemailerService.ts`
- [ ] 7.3 Create email template `invoiceEmail.ejs` in `Identity/src/templates/`
- [x] 7.4 Create email route in `Identity/src/infrastructure/http/routes/email.routes.ts`
- [x] 7.5 Create email controller in `Identity/src/infrastructure/http/controllers/EmailController.ts`
- [x] 7.6 Register email routes in `Identity/src/infrastructure/http/server.ts`
- [x] 7.7 Add API key authentication for email endpoint in Identity
- [ ] 7.8 Write unit tests for sendInvoice method

## Phase 8: End-to-End Testing & Verification

- [x] 8.1 Create unit tests for Payment entity
- [x] 8.2 Create unit tests for Invoice entity
- [x] 8.3 Create unit tests for Coupon entity
- [x] 8.4 Create unit tests for PaymentProvider (mock)
- [ ] 8.5 Test full payment flow (requires running services)
- [ ] 8.6 Test payment for non-existent order (requires running services)
- [ ] 8.7 Test payment for another user's order (requires running services)
- [ ] 8.8 Test payment for already paid order (requires running services)
- [ ] 8.9 Test valid coupon application (requires running services)
- [ ] 8.10 Test invalid coupon rejection (requires running services)
- [ ] 8.11 Test expired coupon rejection (requires running services)
- [ ] 8.12 Test invoice PDF download (requires running services)
- [ ] 8.13 Test list payments for authenticated user (requires running services)
- [ ] 8.14 Test list invoices for authenticated user (requires running services)
- [ ] 8.15 Verify all endpoints return correct HTTP status codes (requires running services)
- [ ] 8.16 Verify error responses match specification (requires running services)

## Implementation Order

1. **Phase 1** first - establishes foundation and verifies Rust toolchain works
2. **Phase 2** second - domain entities are required by ports
3. **Phase 3** third - traits define contracts needed by application layer
4. **Phase 4** fourth - application logic uses domain entities and ports
5. **Phase 5** fifth - infrastructure implements the ports
6. **Phase 6** sixth - HTTP layer wires everything together
7. **Phase 7** seventh - Identity integration for emails
8. **Phase 8** last - E2E verification

## Notes

- Payment providers (Stripe/PayPal) can be mocked initially for testing
- Email sending can be tested with mock HTTP responses
- Use testcontainers for PostgreSQL in integration tests
- Consider using TDD: write failing test first, then implement
