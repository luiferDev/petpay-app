//! List payments query

use crate::application::dto::PaymentListResponse;
use crate::domain::errors::DomainError;
use crate::ports::repository::PaymentRepository;
use std::sync::Arc;

/// List payments query
pub struct ListPaymentsQuery {
    payment_repo: Arc<dyn PaymentRepository>,
}

impl ListPaymentsQuery {
    pub fn new(payment_repo: Arc<dyn PaymentRepository>) -> Self {
        Self { payment_repo }
    }
    
    pub async fn execute(
        &self,
        customer_id: &str,
    ) -> Result<PaymentListResponse, DomainError> {
        // 1. Find all payments for customer
        let payments = self.payment_repo
            .find_by_customer(customer_id)
            .await?;
        
        Ok(PaymentListResponse::from_domain(&payments))
    }
}
