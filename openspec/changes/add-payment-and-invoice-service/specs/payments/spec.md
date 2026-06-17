# Payments & Invoicing Specification

## Purpose

Handle payments and invoicing for Petpay platform with multiple payment methods (PayPal, Stripe, Credit Cards) and automatic invoice generation.

## Requirements

### Requirement: Process Payment

The system MUST allow authenticated users to process payments for existing orders.

#### Scenario: Process payment with Stripe

- GIVEN an authenticated user with a valid order
- WHEN the user submits payment with Stripe
- THEN payment is created with status PENDING
- AND Stripe payment is processed
- AND on success, payment status changes to COMPLETED
- AND invoice is generated and sent via email

#### Scenario: Process payment with PayPal

- GIVEN an authenticated user with a valid order
- WHEN the user submits payment with PayPal
- THEN payment is created with status PENDING
- AND PayPal payment is processed
- AND on success, payment status changes to COMPLETED

#### Scenario: Process payment with Credit Card

- GIVEN an authenticated user with a valid order
- WHEN the user submits payment with credit card details
- THEN payment is created with status PENDING
- AND card payment is processed via Stripe
- AND on success, payment status changes to COMPLETED

#### Scenario: Payment for non-existent order

- GIVEN an authenticated user
- WHEN the user tries to pay for non-existent order
- THEN the request is rejected with 400 Bad Request
- AND no payment is created

#### Scenario: Payment for another user's order

- GIVEN an authenticated user (User A)
- WHEN User A tries to pay for User B's order
- THEN the request is rejected with 403 Forbidden
- AND no payment is created

### Requirement: Validate Order for Payment

The system MUST validate that an order exists and belongs to the user before processing payment.

#### Scenario: Valid order belonging to user

- GIVEN an authenticated user with an existing order
- WHEN the user requests to pay for that order
- THEN the order is validated
- AND payment processing can proceed

#### Scenario: Order already paid

- GIVEN an authenticated user with an order that already has a completed payment
- WHEN the user tries to pay again
- THEN the request is rejected with 400 Bad Request
- AND message indicates order is already paid

### Requirement: Generate Invoice

The system MUST generate an invoice after successful payment.

#### Scenario: Generate invoice after payment

- GIVEN a successful payment
- WHEN payment status changes to COMPLETED
- THEN an invoice is created with status ISSUED
- AND PDF is generated with invoice details

#### Scenario: Invoice details

- GIVEN an invoice is generated
- THEN it MUST contain:
  - Invoice number (unique)
  - Customer name (full name)
  - Customer email
  - Order details (items, quantities, prices)
  - Subtotal
  - Tax
  - Discount (if applied)
  - Total
  - Payment method used
  - Payment status
  - Date issued

### Requirement: Send Invoice Email

The system MUST send invoice via email using Identity email service.

#### Scenario: Send invoice email after generation

- GIVEN a generated invoice
- WHEN the invoice is created
- THEN an email is sent to the customer
- AND the email contains the PDF attachment
- AND the email greeting includes customer's full name
- AND the email includes payment status
- AND the email includes cordialities/closing

#### Scenario: Email service unavailable

- GIVEN a generated invoice
- WHEN the email service call fails
- THEN the invoice is still created
- AND the error is logged for retry
- AND customer can download invoice later

### Requirement: Apply Discount Coupon

The system MUST allow users to apply discount coupons to orders.

#### Scenario: Apply valid coupon

- GIVEN a valid coupon code
- WHEN the user applies the coupon to order
- THEN discount is calculated
- AND total is reduced

#### Scenario: Apply invalid coupon

- GIVEN an invalid coupon code
- WHEN the user tries to apply it
- THEN the request is rejected with 400 Bad Request

#### Scenario: Apply expired coupon

- GIVEN an expired coupon
- WHEN the user tries to apply it
- THEN the request is rejected with 400 Bad Request

### Requirement: List Payments

The system MUST allow users to list their payments.

#### Scenario: List user's payments

- GIVEN an authenticated user
- WHEN the user requests their payment history
- THEN all payments for that user are returned
- AND they are ordered by date descending

## API Endpoints (for reference in design)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/payments | Process new payment |
| GET | /api/v1/payments/:id | Get payment by ID |
| GET | /api/v1/payments | List user's payments |
| POST | /api/v1/payments/:id/refund | Refund a payment |
| GET | /api/v1/invoices/:id | Get invoice by ID |
| GET | /api/v1/invoices | List user's invoices |
| GET | /api/v1/invoices/:id/pdf | Download invoice PDF |
| POST | /api/v1/coupons/validate | Validate coupon code |
| POST | /api/v1/coupons/apply | Apply coupon to order |

## Data Models

### Payment Entity
- id: UUID
- order_id: string
- customer_id: string  
- amount: decimal
- currency: string
- method: enum (STRIPE, PAYPAL, CREDIT_CARD)
- status: enum (PENDING, COMPLETED, FAILED, REFUNDED)
- provider_payment_id: string (optional)
- created_at: timestamp
- updated_at: timestamp

### Invoice Entity
- id: UUID
- invoice_number: string (unique)
- payment_id: UUID
- customer_id: string
- customer_name: string
- customer_email: string
- subtotal: decimal
- tax: decimal
- discount: decimal
- total: decimal
- status: enum (ISSUED, SENT, PAID)
- pdf_path: string (optional)
- created_at: timestamp

### InvoiceItem Entity
- id: UUID
- invoice_id: UUID
- description: string
- quantity: integer
- unit_price: decimal
- total: decimal

### DiscountCoupon Entity
- id: UUID
- code: string (unique)
- discount_type: enum (PERCENTAGE, FIXED)
- discount_value: decimal
- min_order_amount: decimal (optional)
- valid_from: timestamp
- valid_until: timestamp
- max_uses: integer (optional)
- current_uses: integer

### AppliedCoupon Entity
- id: UUID
- coupon_id: UUID
- order_id: UUID
- discount_amount: decimal
- applied_at: timestamp
