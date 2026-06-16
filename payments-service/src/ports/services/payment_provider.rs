//! Payment provider trait

use async_trait::async_trait;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// Payment provider error
#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for PaymentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for PaymentError {}

/// Payment result from provider
#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentResult {
    pub provider_payment_id: String,
    pub status: String,
}

/// Payment provider trait (Stripe, PayPal, etc.)
#[async_trait]
pub trait PaymentProvider: Send + Sync {
    /// Create a payment with the provider
    async fn create_payment(
        &self,
        amount: Decimal,
        currency: &str,
        token: &str,
    ) -> Result<PaymentResult, PaymentError>;
    
    /// Verify/confirm a payment with the provider
    async fn verify_payment(
        &self,
        provider_payment_id: &str,
    ) -> Result<String, PaymentError>;
    
    /// Refund a payment
    async fn refund_payment(
        &self,
        provider_payment_id: &str,
        amount: Option<Decimal>,
    ) -> Result<String, PaymentError>;
}
