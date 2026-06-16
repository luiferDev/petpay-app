//! Payment repository port

use crate::domain::entities::Payment;
use async_trait::async_trait;
use crate::domain::errors::DomainError;

/// Payment repository trait
#[async_trait]
pub trait PaymentRepository: Send + Sync {
    /// Create a new payment
    async fn create(&self, payment: &Payment) -> Result<Payment, DomainError>;
    
    /// Find payment by ID
    async fn find_by_id(&self, id: &str) -> Result<Option<Payment>, DomainError>;
    
    /// Find payment by order ID
    async fn find_by_order_id(&self, order_id: &str) -> Result<Option<Payment>, DomainError>;
    
    /// Find payments by customer ID
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Payment>, DomainError>;
    
    /// Update payment
    async fn update(&self, payment: &Payment) -> Result<Payment, DomainError>;
}
