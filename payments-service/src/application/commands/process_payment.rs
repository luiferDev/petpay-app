//! Process payment command

use crate::application::dto::{CreatePaymentRequest, PaymentResponse};
use crate::domain::entities::{Payment, PaymentStatus};
use crate::domain::errors::DomainError;
use crate::ports::repository::PaymentRepository;
use crate::ports::services::{PaymentProvider, EmailSender, OrderValidator};
use std::sync::Arc;

/// Process payment command
pub struct ProcessPaymentCommand<P, E, O> 
where
    P: PaymentProvider,
    E: EmailSender,
    O: OrderValidator,
{
    payment_repo: Arc<dyn PaymentRepository>,
    payment_provider: Arc<P>,
    email_sender: Arc<E>,
    order_validator: Arc<O>,
}

impl<P, E, O> ProcessPaymentCommand<P, E, O>
where
    P: PaymentProvider,
    E: EmailSender,
    O: OrderValidator,
{
    pub fn new(
        payment_repo: Arc<dyn PaymentRepository>,
        payment_provider: Arc<P>,
        email_sender: Arc<E>,
        order_validator: Arc<O>,
    ) -> Self {
        Self {
            payment_repo,
            payment_provider,
            email_sender,
            order_validator,
        }
    }
    
    pub async fn execute(
        &self,
        request: &CreatePaymentRequest,
        customer_id: &str,
        customer_email: &str,
        customer_name: &str,
    ) -> Result<PaymentResponse, DomainError> {
        // 1. Validate order exists and belongs to user
        let order = self.order_validator
            .get_order(&request.order_id, customer_id)
            .await
            .map_err(|e| DomainError::OrderNotFound(e.message))?;
        
        // 2. Check if order is already paid
        if order.is_paid {
            return Err(DomainError::OrderAlreadyPaid(request.order_id.clone()));
        }
        
        // 3. Check for existing payment for this order
        let existing_payment = self.payment_repo
            .find_by_order_id(&request.order_id)
            .await?;
        
        if existing_payment.is_some() {
            return Err(DomainError::OrderAlreadyPaid(request.order_id.clone()));
        }
        
        // 4. Create payment record with PENDING status
        let payment = Payment::new(
            request.order_id.clone(),
            customer_id.to_string(),
            order.total_amount,
            order.currency.clone(),
            request.payment_method,
        );
        
        let created_payment = self.payment_repo
            .create(&payment)
            .await?;
        
        // 5. Process payment with provider
        let provider_token = request.provider_token
            .as_deref()
            .unwrap_or("default_token");
        
        let total_amount = order.total_amount;
        let currency = order.currency.clone();
        
        let result = self.payment_provider
            .create_payment(
                total_amount,
                &currency,
                provider_token,
            )
            .await
            .map_err(|e| DomainError::PaymentProviderError(e.message))?;
        
        // 6. Update payment status based on provider result
        let mut updated_payment = created_payment.clone();
        
        if result.status == "succeeded" || result.status == "COMPLETED" {
            updated_payment.mark_completed(result.provider_payment_id.clone());
        } else {
            updated_payment.mark_failed();
        }
        
        let final_payment = self.payment_repo
            .update(&updated_payment)
            .await?;
        
        // 7. If payment successful, send invoice email (async, don't block)
        if final_payment.status == PaymentStatus::Completed {
            // TODO: Generate invoice and PDF
            // TODO: Send email with invoice
            // This is fire-and-forget, errors are logged but don't fail the request
            let _ = self.send_invoice_email(
                customer_email,
                customer_name,
                &final_payment,
            ).await;
        }
        
        Ok(PaymentResponse::from_domain(&final_payment))
    }
    
    async fn send_invoice_email(
        &self,
        email: &str,
        _name: &str,
        payment: &Payment,
    ) -> Result<String, DomainError> {
        // TODO: Generate PDF and send email
        // Placeholder for now
        tracing::info!("Would send invoice email to {} for payment {}", email, payment.id);
        Ok("email_queued".to_string())
    }
}
