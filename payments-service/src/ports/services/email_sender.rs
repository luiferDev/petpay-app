//! Email sender trait

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// Email error
#[derive(Debug, Serialize, Deserialize)]
pub struct EmailError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for EmailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for EmailError {}

/// Email sender trait
#[async_trait]
pub trait EmailSender: Send + Sync {
    /// Send invoice email with PDF attachment
    async fn send_invoice(
        &self,
        to: &str,
        full_name: &str,
        invoice_pdf: &[u8],
        invoice_number: &str,
        payment_status: &str,
    ) -> Result<String, EmailError>;
}
