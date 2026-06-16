//! Invoice response DTO

use crate::domain::entities::{Invoice, InvoiceStatus};
use rust_decimal::prelude::ToPrimitive;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct InvoiceResponse {
    pub id: String,
    #[serde(rename = "invoiceNumber")]
    pub invoice_number: String,
    #[serde(rename = "paymentId")]
    pub payment_id: String,
    #[serde(rename = "customerId")]
    pub customer_id: String,
    #[serde(rename = "customerName")]
    pub customer_name: String,
    #[serde(rename = "customerEmail")]
    pub customer_email: String,
    pub subtotal: f64,
    pub tax: f64,
    pub discount: f64,
    pub total: f64,
    pub status: InvoiceStatus,
    #[serde(rename = "pdfPath")]
    pub pdf_path: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

impl InvoiceResponse {
    pub fn from_domain(invoice: &Invoice) -> Self {
        Self {
            id: invoice.id.to_string(),
            invoice_number: invoice.invoice_number.clone(),
            payment_id: invoice.payment_id.to_string(),
            customer_id: invoice.customer_id.clone(),
            customer_name: invoice.customer_name.clone(),
            customer_email: invoice.customer_email.clone(),
            subtotal: invoice.subtotal.to_f64().unwrap_or(0.0),
            tax: invoice.tax.to_f64().unwrap_or(0.0),
            discount: invoice.discount.to_f64().unwrap_or(0.0),
            total: invoice.total.to_f64().unwrap_or(0.0),
            status: invoice.status,
            pdf_path: invoice.pdf_path.clone(),
            created_at: invoice.created_at.to_rfc3339(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct InvoiceListResponse {
    pub invoices: Vec<InvoiceResponse>,
    pub total: usize,
}

impl InvoiceListResponse {
    pub fn from_domain(invoices: &[Invoice]) -> Self {
        Self {
            invoices: invoices.iter().map(InvoiceResponse::from_domain).collect(),
            total: invoices.len(),
        }
    }
}
