//! Get payment query

use crate::application::dto::PaymentResponse;
use crate::domain::errors::DomainError;
use crate::ports::repository::PaymentRepository;
use std::sync::Arc;

/// Get payment by ID query
pub struct GetPaymentQuery {
    payment_repo: Arc<dyn PaymentRepository>,
}

impl GetPaymentQuery {
    pub fn new(payment_repo: Arc<dyn PaymentRepository>) -> Self {
        Self { payment_repo }
    }
    
    pub async fn execute(
        &self,
        payment_id: &str,
        customer_id: &str,
    ) -> Result<PaymentResponse, DomainError> {
        // 1. Find payment
        let payment = self.payment_repo
            .find_by_id(payment_id)
            .await?
            .ok_or_else(|| DomainError::PaymentNotFound(payment_id.to_string()))?;
        
        // 2. Verify ownership
        if payment.customer_id != customer_id {
            return Err(DomainError::OrderNotOwned(payment_id.to_string()));
        }
        
        Ok(PaymentResponse::from_domain(&payment))
    }
}
