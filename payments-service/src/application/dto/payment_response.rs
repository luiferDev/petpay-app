//! Payment response DTO

use crate::domain::entities::{Payment, PaymentMethod, PaymentStatus};
use rust_decimal::prelude::ToPrimitive;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PaymentResponse {
    pub id: String,
    #[serde(rename = "orderId")]
    pub order_id: String,
    #[serde(rename = "customerId")]
    pub customer_id: String,
    pub amount: f64,
    pub currency: String,
    #[serde(rename = "method")]
    pub payment_method: PaymentMethod,
    pub status: PaymentStatus,
    #[serde(rename = "providerPaymentId")]
    pub provider_payment_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl PaymentResponse {
    pub fn from_domain(payment: &Payment) -> Self {
        Self {
            id: payment.id.to_string(),
            order_id: payment.order_id.clone(),
            customer_id: payment.customer_id.clone(),
            amount: payment.amount.to_f64().unwrap_or(0.0),
            currency: payment.currency.clone(),
            payment_method: payment.method,
            status: payment.status,
            provider_payment_id: payment.provider_payment_id.clone(),
            created_at: payment.created_at.to_rfc3339(),
            updated_at: payment.updated_at.to_rfc3339(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct PaymentListResponse {
    pub payments: Vec<PaymentResponse>,
    pub total: usize,
}

impl PaymentListResponse {
    pub fn from_domain(payments: &[Payment]) -> Self {
        Self {
            payments: payments.iter().map(PaymentResponse::from_domain).collect(),
            total: payments.len(),
        }
    }
}
