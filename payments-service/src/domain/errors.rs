//! Domain errors

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Base error type for the application
#[derive(Debug, Error, Serialize, Deserialize)]
pub enum DomainError {
    #[error("Payment not found: {0}")]
    PaymentNotFound(String),

    #[error("Invoice not found: {0}")]
    InvoiceNotFound(String),

    #[error("Order not found: {0}")]
    OrderNotFound(String),

    #[error("Order already paid: {0}")]
    OrderAlreadyPaid(String),

    #[error("Order does not belong to user: {0}")]
    OrderNotOwned(String),

    #[error("Invalid payment method: {0}")]
    InvalidPaymentMethod(String),

    #[error("Payment provider error: {0}")]
    PaymentProviderError(String),

    #[error("Email service error: {0}")]
    EmailServiceError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Internal server error: {0}")]
    InternalError(String),
}

impl DomainError {
    /// Get HTTP status code for this error
    pub fn status_code(&self) -> u16 {
        match self {
            DomainError::PaymentNotFound(_) => 404,
            DomainError::InvoiceNotFound(_) => 404,
            DomainError::OrderNotFound(_) => 400,
            DomainError::OrderAlreadyPaid(_) => 400,
            DomainError::OrderNotOwned(_) => 403,
            DomainError::InvalidPaymentMethod(_) => 400,
            DomainError::PaymentProviderError(_) => 502,
            DomainError::EmailServiceError(_) => 502,
            DomainError::ValidationError(_) => 400,
            DomainError::InternalError(_) => 500,
        }
    }
}

// Re-export for convenience
pub use crate::domain::entities::coupon::CouponError;
