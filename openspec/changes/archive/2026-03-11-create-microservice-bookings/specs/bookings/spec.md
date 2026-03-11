# Bookings Service Specification

## Purpose

Manejar reservas de servicios para mascotas (transporte, estadía, grooming, veterinario) con comunicación asíncrona y confirmaciones por email.

## Requirements

### Requirement: Create Booking

The system MUST allow customers to create a new booking for pet services.

#### Scenario: Create booking successfully

- GIVEN a valid customer with authenticated session
- WHEN the customer submits booking details (service type, date, time, location, pet info)
- THEN a new booking is created with status PENDING
- AND a confirmation email is sent to the customer
- AND an event is published to RabbitMQ

#### Scenario: Create booking with invalid service type

- GIVEN a valid customer
- WHEN the customer submits booking with invalid service type
- THEN the request is rejected with 400 Bad Request
- AND no booking is created

#### Scenario: Create booking for past date

- GIVEN a valid customer
- WHEN the customer submits booking with scheduled date in the past
- THEN the request is rejected with 400 Bad Request
- AND no booking is created

### Requirement: Get Booking

The system MUST allow retrieving booking details by ID.

#### Scenario: Get existing booking

- GIVEN a booking exists in the system
- WHEN a user requests the booking by ID
- THEN the booking details are returned

#### Scenario: Get non-existent booking

- GIVEN no booking exists with the given ID
- WHEN a user requests the booking
- THEN 404 Not Found is returned

### Requirement: List Bookings

The system MUST allow listing bookings with filters.

#### Scenario: List bookings for customer

- GIVEN a customer has multiple bookings
- WHEN the customer requests their bookings
- THEN all bookings for that customer are returned
- AND they are ordered by scheduled date descending

#### Scenario: List bookings with status filter

- GIVEN a customer has bookings in different statuses
- WHEN the customer filters by status (e.g., PENDING)
- THEN only bookings with that status are returned

### Requirement: Update Booking Status

The system MUST allow updating booking status.

#### Scenario: Confirm booking (provider)

- GIVEN a booking with status PENDING
- WHEN a provider confirms the booking
- THEN status changes to CONFIRMED
- AND email notification is sent to customer

#### Scenario: Cancel booking

- GIVEN a booking with status PENDING or CONFIRMED
- WHEN a customer or provider cancels the booking
- THEN status changes to CANCELLED
- AND email notification is sent to customer

#### Scenario: Complete booking

- GIVEN a booking with status CONFIRMED
- WHEN the service is completed
- THEN status changes to COMPLETED
- AND email notification is sent to customer

### Requirement: Publish Booking Events

The system MUST publish events to RabbitMQ when booking status changes.

#### Scenario: Publish booking created event

- GIVEN a new booking is created
- WHEN the booking is persisted
- THEN a "booking.created" event is published to RabbitMQ

#### Scenario: Publish booking status changed event

- GIVEN a booking status is updated
- WHEN the status is persisted
- THEN a "booking.status_changed" event is published to RabbitMQ

### Requirement: Send Confirmation Email

The system MUST send confirmation emails via Identity email service.

#### Scenario: Send email on booking creation

- GIVEN a booking is successfully created
- WHEN the booking is saved
- THEN a POST request is made to Identity email service
- AND the customer receives a confirmation email

#### Scenario: Email service unavailable

- GIVEN a booking is successfully created
- WHEN the email service call fails
- THEN the booking is still created successfully
- AND the error is logged for retry

## API Endpoints (for reference in design)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/bookings | Create booking |
| GET | /api/v1/bookings/:id | Get booking by ID |
| GET | /api/v1/bookings | List bookings (with filters) |
| PATCH | /api/v1/bookings/:id/status | Update booking status |
| DELETE | /api/v1/bookings/:id | Cancel booking |

## Data Model

### Booking Entity
- id: UUID
- customer_id: string
- provider_id: string (nullable, assigned when confirmed)
- service_type: enum (TRANSPORT, SITTING, GROOMING, VET_APPOINTMENT)
- status: enum (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)
- scheduled_date: date
- start_time: time
- end_time: time
- origin_location: string
- destination_location: string
- pet_id: string
- price: decimal
- currency: string (default: USD)
- details: JSONB (service-specific details)
- notes: string (optional)
- created_at: timestamp
- updated_at: timestamp