//! List invoices query

use crate::application::dto::InvoiceListResponse;
use crate::domain::errors::DomainError;
use crate::ports::repository::InvoiceRepository;
use std::sync::Arc;

/// List invoices query
pub struct ListInvoicesQuery {
    invoice_repo: Arc<dyn InvoiceRepository>,
}

impl ListInvoicesQuery {
    pub fn new(invoice_repo: Arc<dyn InvoiceRepository>) -> Self {
        Self { invoice_repo }
    }
    
    pub async fn execute(
        &self,
        customer_id: &str,
    ) -> Result<InvoiceListResponse, DomainError> {
        // 1. Find all invoices for customer
        let invoices = self.invoice_repo
            .find_by_customer(customer_id)
            .await?;
        
        Ok(InvoiceListResponse::from_domain(&invoices))
    }
}
