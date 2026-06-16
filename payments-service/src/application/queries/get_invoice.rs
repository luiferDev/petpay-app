//! Get invoice query

use crate::application::dto::InvoiceResponse;
use crate::domain::errors::DomainError;
use crate::ports::repository::InvoiceRepository;
use std::sync::Arc;

/// Get invoice by ID query
pub struct GetInvoiceQuery {
    invoice_repo: Arc<dyn InvoiceRepository>,
}

impl GetInvoiceQuery {
    pub fn new(invoice_repo: Arc<dyn InvoiceRepository>) -> Self {
        Self { invoice_repo }
    }
    
    pub async fn execute(
        &self,
        invoice_id: &str,
        customer_id: &str,
    ) -> Result<InvoiceResponse, DomainError> {
        // 1. Find invoice
        let invoice = self.invoice_repo
            .find_by_id(invoice_id)
            .await?
            .ok_or_else(|| DomainError::InvoiceNotFound(invoice_id.to_string()))?;
        
        // 2. Verify ownership
        if invoice.customer_id != customer_id {
            return Err(DomainError::OrderNotOwned(invoice_id.to_string()));
        }
        
        Ok(InvoiceResponse::from_domain(&invoice))
    }
}
