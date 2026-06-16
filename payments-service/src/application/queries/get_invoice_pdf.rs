//! Get invoice PDF query

use crate::domain::errors::DomainError;
use crate::ports::repository::InvoiceRepository;
use std::sync::Arc;
use std::path::PathBuf;

/// Get invoice PDF query
pub struct GetInvoicePdfQuery {
    invoice_repo: Arc<dyn InvoiceRepository>,
    pdf_storage_path: String,
}

impl GetInvoicePdfQuery {
    pub fn new(invoice_repo: Arc<dyn InvoiceRepository>, pdf_storage_path: String) -> Self {
        Self { invoice_repo, pdf_storage_path }
    }
    
    pub async fn execute(
        &self,
        invoice_id: &str,
        customer_id: &str,
    ) -> Result<Vec<u8>, DomainError> {
        // 1. Find invoice
        let invoice = self.invoice_repo
            .find_by_id(invoice_id)
            .await?
            .ok_or_else(|| DomainError::InvoiceNotFound(invoice_id.to_string()))?;
        
        // 2. Verify ownership
        if invoice.customer_id != customer_id {
            return Err(DomainError::OrderNotOwned(invoice_id.to_string()));
        }
        
        // 3. Get PDF path
        let pdf_path = invoice.pdf_path
            .as_ref()
            .ok_or_else(|| DomainError::ValidationError(
                "Invoice PDF not available".to_string(),
            ))?;
        
        // 4. Read PDF file
        let full_path = PathBuf::from(&self.pdf_storage_path)
            .join(pdf_path);
        
        std::fs::read(&full_path)
            .map_err(|e| DomainError::InternalError(
                format!("Failed to read PDF: {}", e),
            ))
    }
}
