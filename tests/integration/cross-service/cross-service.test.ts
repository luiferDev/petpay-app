/**
 * Cross-service Integration Tests for PetPay
 *
 * Tests end-to-end flows across multiple microservices.
 * Requires all services to be running (via docker-compose.test.yml).
 *
 * Usage:
 *   bun test tests/integration/cross-service/
 *
 * Environment variables (optional, with defaults):
 *   IDENTITY_URL=http://localhost:3000
 *   MARKETPLACE_URL=http://localhost:8080
 *   CATALOG_URL=http://localhost:8081
 *   BOOKINGS_URL=http://localhost:8082
 *   PAYMENTS_URL=http://localhost:8083
 *   RABBITMQ_URL=amqp://guest:guest@localhost:5672
 */

import { describe, it, expect, beforeAll } from 'bun:test'

const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:3000'
const MARKETPLACE_URL = process.env.MARKETPLACE_URL || 'http://localhost:8080'
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:8081'
const BOOKINGS_URL = process.env.BOOKINGS_URL || 'http://localhost:8082'
const PAYMENTS_URL = process.env.PAYMENTS_URL || 'http://localhost:8083'

// ─── Helpers ────────────────────────────────────────────

async function healthCheck(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

interface TestUser {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

let testUser: TestUser
let authTokens: AuthTokens
let createdOrderId: string
let createdPaymentId: string
let createdBookingId: string
let createdProductId: string
let testCouponCode: string

const servicesAvailable = {
  identity: false,
  marketplace: false,
  catalog: false,
  bookings: false,
  payments: false,
}

// ─── Setup ──────────────────────────────────────────────

beforeAll(async () => {
  // Check which services are available
  servicesAvailable.identity = await healthCheck(IDENTITY_URL)
  servicesAvailable.marketplace = await healthCheck(MARKETPLACE_URL)
  servicesAvailable.catalog = await healthCheck(CATALOG_URL)
  servicesAvailable.bookings = await healthCheck(BOOKINGS_URL)
  servicesAvailable.payments = await healthCheck(PAYMENTS_URL)

  console.log('Services available:', servicesAvailable)

  // Generate unique test user
  const ts = Date.now()
  testUser = {
    email: `integration-test-${ts}@test.petpay.app`,
    password: 'TestPass123!',
    firstName: 'Integration',
    lastName: 'Tester',
    role: 'USER',
  }
})

// ─── 1. Health Checks ───────────────────────────────────

describe('Health Checks', () => {
  it('Identity service is healthy', async () => {
    expect(servicesAvailable.identity).toBe(true)
  })

  it('Marketplace service is healthy', async () => {
    expect(servicesAvailable.marketplace).toBe(true)
  })

  it('Catalog service is healthy', async () => {
    expect(servicesAvailable.catalog).toBe(true)
  })

  it('Bookings service is healthy', async () => {
    expect(servicesAvailable.bookings).toBe(true)
  })

  it('Payments service is healthy', async () => {
    expect(servicesAvailable.payments).toBe(true)
  })
})

// ─── 2. Identity Auth Flow ──────────────────────────────

describe('Identity - Auth Flow', () => {
  const itIfIdentity = servicesAvailable.identity ? it : it.skip

  itIfIdentity('Register a new user', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.email).toBe(testUser.email)
    expect(body.role).toBe('USER')
  })

  itIfIdentity('Reject duplicate registration', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
    expect(res.status).toBe(409)
  })

  itIfIdentity('Login with valid credentials', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body).toHaveProperty('refreshToken')
    expect(body.accessToken).toBeTruthy()
    authTokens = { accessToken: body.accessToken, refreshToken: body.refreshToken }
  })

  itIfIdentity('Reject login with wrong password', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword!',
      }),
    })
    expect(res.status).toBe(401)
  })

  itIfIdentity('Reject login for non-existent user', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@test.petpay.app',
        password: 'SomePass123!',
      }),
    })
    expect(res.status).toBe(404)
  })

  itIfIdentity('Access protected endpoint with valid token', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${authTokens.accessToken}`,
      },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe(testUser.email)
  })

  itIfIdentity('Reject access without token', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/users/me`)
    expect(res.status).toBe(401)
  })

  itIfIdentity('Reject access with invalid token', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/users/me`, {
      headers: { Authorization: 'Bearer invalid-token-here' },
    })
    expect(res.status).toBe(401)
  })

  itIfIdentity('Refresh token', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authTokens.refreshToken }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body).toHaveProperty('refreshToken')
    // Update tokens for subsequent tests
    authTokens = body
  })

  itIfIdentity('Logout successfully', async () => {
    const res = await fetch(`${IDENTITY_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokens.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: authTokens.refreshToken }),
    })
    expect(res.status).toBe(200)
  })
})

// ─── 3. Marketplace Flow (requires Identity) ────────────

describe('Marketplace - Order Flow', () => {
  const available = servicesAvailable.marketplace && servicesAvailable.identity
  const itIfAvailable = available ? it : it.skip

  itIfAvailable('Create an order with auth token', async () => {
    const res = await fetch(`${MARKETPLACE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokens.accessToken}`,
      },
      body: JSON.stringify({
        customerId: 'integration-test-customer',
        items: [
          { productId: 'prod-1', quantity: 2, price: 29.99 },
          { productId: 'prod-2', quantity: 1, price: 49.99 },
        ],
        total: 109.97,
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('status')
    createdOrderId = String(body.id)
  })

  itIfAvailable('Get the created order by ID', async () => {
    const res = await fetch(`${MARKETPLACE_URL}/api/v1/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${authTokens.accessToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(String(body.id)).toBe(createdOrderId)
  })

  itIfAvailable('List orders', async () => {
    const res = await fetch(`${MARKETPLACE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${authTokens.accessToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  itIfAvailable('Return 404 for non-existent order', async () => {
    const res = await fetch(`${MARKETPLACE_URL}/api/v1/orders/999999`, {
      headers: { Authorization: `Bearer ${authTokens.accessToken}` },
    })
    expect(res.status).toBe(404)
  })
})

// ─── 4. Catalog Flow ───────────────────────────────────

describe('Catalog - Product Flow', () => {
  const available = servicesAvailable.catalog
  const itIfAvailable = available ? it : it.skip

  itIfAvailable('Create a product', async () => {
    const res = await fetch(`${CATALOG_URL}/api/v1/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test Product',
        description: 'A product created during integration testing',
        price: 19.99,
        category: 'TESTING',
        stock: 100,
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.name).toBe('Integration Test Product')
    createdProductId = String(body.id)
  })

  itIfAvailable('Get the created product', async () => {
    const res = await fetch(`${CATALOG_URL}/api/v1/products/${createdProductId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(String(body.id)).toBe(createdProductId)
  })

  itIfAvailable('List all products', async () => {
    const res = await fetch(`${CATALOG_URL}/api/v1/products`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  itIfAvailable('Filter products by category', async () => {
    const res = await fetch(`${CATALOG_URL}/api/v1/products?category=TESTING`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

// ─── 5. Bookings Flow ──────────────────────────────────

describe('Bookings - Booking Flow', () => {
  const available = servicesAvailable.bookings
  const itIfAvailable = available ? it : it.skip

  itIfAvailable('Create a booking', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const startTime = new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString()
    const endTime = new Date(tomorrow.setHours(12, 0, 0, 0)).toISOString()

    const res = await fetch(`${BOOKINGS_URL}/api/v1/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'integration-test-customer',
        serviceProviderId: 'provider-1',
        serviceType: 'GROOMING',
        startTime,
        endTime,
        notes: 'Integration test booking',
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.status).toBe('pending')
    createdBookingId = String(body.id)
  })

  itIfAvailable('Get booking by ID', async () => {
    const res = await fetch(`${BOOKINGS_URL}/api/v1/bookings/${createdBookingId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(String(body.id)).toBe(createdBookingId)
  })

  itIfAvailable('Transition booking to confirmed', async () => {
    const res = await fetch(`${BOOKINGS_URL}/api/v1/bookings/${createdBookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('confirmed')
  })

  itIfAvailable('Transition booking to completed', async () => {
    const res = await fetch(`${BOOKINGS_URL}/api/v1/bookings/${createdBookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('completed')
  })

  itIfAvailable('Reject invalid booking (missing fields)', async () => {
    const res = await fetch(`${BOOKINGS_URL}/api/v1/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

// ─── 6. Payments Flow ──────────────────────────────────

describe('Payments - Payment Flow', () => {
  const available = servicesAvailable.payments
  const itIfAvailable = available ? it : it.skip

  itIfAvailable('Create a payment', async () => {
    const res = await fetch(`${PAYMENTS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: createdOrderId || 'test-order-id',
        customerId: 'integration-test-customer',
        amount: 109.97,
        currency: 'COP',
        method: 'stripe',
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    createdPaymentId = String(body.id)
  })

  itIfAvailable('Get payment by ID', async () => {
    const res = await fetch(`${PAYMENTS_URL}/api/v1/payments/${createdPaymentId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(String(body.id)).toBe(createdPaymentId)
  })

  itIfAvailable('List payments', async () => {
    const res = await fetch(`${PAYMENTS_URL}/api/v1/payments`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  itIfAvailable('Validate a coupon', async () => {
    const res = await fetch(`${PAYMENTS_URL}/api/v1/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'WELCOME10',
        orderAmount: 109.97,
      }),
    })
    // 200 if coupon exists, 404 if not — both are valid
    expect([200, 404]).toContain(res.status)
  })
})

// ─── 7. Cross-service Full Flow ─────────────────────────

describe('Cross-Service - Full Order Lifecycle', () => {
  const allAvailable =
    servicesAvailable.identity &&
    servicesAvailable.marketplace &&
    servicesAvailable.payments

  const itIfAvailable = allAvailable ? it : it.skip

  itIfAvailable('Register -> Login -> Create Payment', async () => {
    // We already have authTokens from the Identity tests
    expect(authTokens.accessToken).toBeTruthy()

    // Create an order in Marketplace
    const orderRes = await fetch(`${MARKETPLACE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokens.accessToken}`,
      },
      body: JSON.stringify({
        customerId: 'e2e-test-customer',
        items: [{ productId: 'e2e-prod', quantity: 1, price: 99.99 }],
        total: 99.99,
      }),
    })
    expect(orderRes.status).toBe(201)
    const order = await orderRes.json()
    expect(order).toHaveProperty('id')

    // Create a payment for the order in Payments service
    const payRes = await fetch(`${PAYMENTS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: String(order.id),
        customerId: 'e2e-test-customer',
        amount: 99.99,
        currency: 'COP',
        method: 'stripe',
      }),
    })
    expect(payRes.status).toBe(201)
    const payment = await payRes.json()
    expect(payment).toHaveProperty('id')

    // Verify the payment exists
    const getPayRes = await fetch(`${PAYMENTS_URL}/api/v1/payments/${payment.id}`)
    expect(getPayRes.status).toBe(200)
  })
})

// ─── Summary ─────────────────────────────────────────────

afterAll(() => {
  const summary = {
    identity: servicesAvailable.identity ? '✅' : '❌',
    marketplace: servicesAvailable.marketplace ? '✅' : '❌',
    catalog: servicesAvailable.catalog ? '✅' : '❌',
    bookings: servicesAvailable.bookings ? '✅' : '❌',
    payments: servicesAvailable.payments ? '✅' : '❌',
    testUser: testUser?.email ?? 'N/A',
  }
  console.log('\n📋 Cross-Service Test Summary:')
  console.table(summary)
})
