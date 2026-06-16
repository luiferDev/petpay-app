//! Refund payment command

use crate::application::dto::PaymentResponse;
use crate::domain::entities::PaymentStatus;
use crate::domain::errors::DomainError;
use crate::ports::repository::PaymentRepository;
use crate::ports::services::PaymentProvider;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use std::sync::Arc;

/// Refund payment command
pub struct RefundPaymentCommand<P>
where
    P: PaymentProvider,
{
    payment_repo: Arc<dyn PaymentRepository>,
    payment_provider: Arc<P>,
}

impl<P> RefundPaymentCommand<P>
where
    P: PaymentProvider,
{
    pub fn new(
        payment_repo: Arc<dyn PaymentRepository>,
        payment_provider: Arc<P>,
    ) -> Self {
        Self {
            payment_repo,
            payment_provider,
        }
    }
    
    pub async fn execute(
        &self,
        payment_id: &str,
        customer_id: &str,
        amount: Option<f64>,
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
        
        // 3. Check payment is completed
        if payment.status != PaymentStatus::Completed {
            return Err(DomainError::ValidationError(
                "Only completed payments can be refunded".to_string(),
            ));
        }
        
        // 4. Process refund with provider
        let provider_payment_id = payment.provider_payment_id
            .as_ref()
            .ok_or_else(|| DomainError::PaymentProviderError(
                "No provider payment ID".to_string(),
            ))?;
        
        let amount_decimal = amount.and_then(|a| Decimal::from_f64(a));
        
        self.payment_provider
            .refund_payment(provider_payment_id, amount_decimal)
            .await
            .map_err(|e| DomainError::PaymentProviderError(e.message))?;
        
        // 5. Update payment status
        let mut updated_payment = payment;
        updated_payment.status = PaymentStatus::Refunded;
        
        let final_payment = self.payment_repo
            .update(&updated_payment)
            .await?;
        
        Ok(PaymentResponse::from_domain(&final_payment))
    }
}
