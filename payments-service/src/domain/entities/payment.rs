//! Payment entity and related types

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Payment entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: Uuid,
    pub order_id: String,
    pub customer_id: String,
    pub amount: Decimal,
    pub currency: String,
    pub method: PaymentMethod,
    pub status: PaymentStatus,
    pub provider_payment_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Payment method
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum PaymentMethod {
    Stripe,
    PayPal,
    CreditCard,
}

impl Default for PaymentMethod {
    fn default() -> Self {
        PaymentMethod::Stripe
    }
}

/// Payment status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
    Refunded,
}

impl Default for PaymentStatus {
    fn default() -> Self {
        PaymentStatus::Pending
    }
}

impl Payment {
    /// Create a new payment
    pub fn new(
        order_id: String,
        customer_id: String,
        amount: Decimal,
        currency: String,
        method: PaymentMethod,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            order_id,
            customer_id,
            amount,
            currency,
            method,
            status: PaymentStatus::Pending,
            provider_payment_id: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Mark payment as completed
    pub fn mark_completed(&mut self, provider_payment_id: String) {
        self.status = PaymentStatus::Completed;
        self.provider_payment_id = Some(provider_payment_id);
        self.updated_at = Utc::now();
    }

    /// Mark payment as failed
    pub fn mark_failed(&mut self) {
        self.status = PaymentStatus::Failed;
        self.updated_at = Utc::now();
    }
}
