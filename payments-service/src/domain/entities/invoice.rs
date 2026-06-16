//! Invoice entity and related types

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Invoice entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: Uuid,
    pub invoice_number: String,
    pub payment_id: Uuid,
    pub customer_id: String,
    pub customer_name: String,
    pub customer_email: String,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub discount: Decimal,
    pub total: Decimal,
    pub status: InvoiceStatus,
    pub pdf_path: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Invoice status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum InvoiceStatus {
    Issued,
    Sent,
    Paid,
}

impl Default for InvoiceStatus {
    fn default() -> Self {
        InvoiceStatus::Issued
    }
}

/// Invoice item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub description: String,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub total: Decimal,
}

impl Invoice {
    /// Create a new invoice
    pub fn new(
        invoice_number: String,
        payment_id: Uuid,
        customer_id: String,
        customer_name: String,
        customer_email: String,
        items: &[InvoiceItem],
        tax_rate: Decimal,
    ) -> Self {
        let subtotal: Decimal = items.iter().map(|i| i.total).sum();
        let tax = subtotal * tax_rate;
        let total = subtotal + tax;

        Self {
            id: Uuid::new_v4(),
            invoice_number,
            payment_id,
            customer_id,
            customer_name,
            customer_email,
            subtotal,
            tax,
            discount: Decimal::ZERO,
            total,
            status: InvoiceStatus::Issued,
            pdf_path: None,
            created_at: Utc::now(),
        }
    }

    /// Mark invoice as sent
    pub fn mark_sent(&mut self) {
        self.status = InvoiceStatus::Sent;
    }

    /// Set PDF path
    pub fn set_pdf_path(&mut self, path: String) {
        self.pdf_path = Some(path);
    }
}

impl InvoiceItem {
    /// Create a new invoice item
    pub fn new(invoice_id: Uuid, description: String, quantity: i32, unit_price: Decimal) -> Self {
        let total = unit_price * Decimal::from(quantity);
        Self {
            id: Uuid::new_v4(),
            invoice_id,
            description,
            quantity,
            unit_price,
            total,
        }
    }
}
