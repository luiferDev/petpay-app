//! Invoice repository port

use crate::domain::entities::Invoice;
use async_trait::async_trait;
use crate::domain::errors::DomainError;

/// Invoice repository trait
#[async_trait]
pub trait InvoiceRepository: Send + Sync {
    /// Create a new invoice
    async fn create(&self, invoice: &Invoice) -> Result<Invoice, DomainError>;
    
    /// Find invoice by ID
    async fn find_by_id(&self, id: &str) -> Result<Option<Invoice>, DomainError>;
    
    /// Find invoice by payment ID
    async fn find_by_payment_id(&self, payment_id: &str) -> Result<Option<Invoice>, DomainError>;
    
    /// Find invoices by customer ID
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Invoice>, DomainError>;
    
    /// Update invoice
    async fn update(&self, invoice: &Invoice) -> Result<Invoice, DomainError>;
}
