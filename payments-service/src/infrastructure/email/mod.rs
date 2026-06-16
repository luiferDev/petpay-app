//! Email client module for Identity service integration

pub mod identity_client {
    use crate::ports::services::email_sender::{EmailSender, EmailError};
    use async_trait::async_trait;
    
    /// Identity email client
    pub struct IdentityEmailClient {
        base_url: String,
        api_key: String,
        client: reqwest::Client,
    }
    
    impl IdentityEmailClient {
        pub fn new(base_url: String, api_key: String) -> Self {
            Self {
                base_url,
                api_key,
                client: reqwest::Client::new(),
            }
        }
    }
    
    #[async_trait]
    impl EmailSender for IdentityEmailClient {
        async fn send_invoice(
            &self,
            to: &str,
            full_name: &str,
            invoice_pdf: &[u8],
            invoice_number: &str,
            payment_status: &str,
        ) -> Result<String, EmailError> {
            // TODO: Implement actual HTTP call to Identity service
            // POST /api/v1/emails/send
            
            let url = format!("{}/api/v1/emails/send", self.base_url);
            
            let body = serde_json::json!({
                "to": to,
                "template": "invoice",
                "subject": format!("Invoice #{}", invoice_number),
                "fullName": full_name,
                "invoiceNumber": invoice_number,
                "paymentStatus": payment_status,
                "attachment": {
                    "filename": format!("invoice-{}.pdf", invoice_number),
                    "content": base64_encode(invoice_pdf),
                }
            });
            
            let response = self.client
                .post(&url)
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| EmailError {
                    code: "REQUEST_FAILED".to_string(),
                    message: e.to_string(),
                })?;
            
            if response.status().is_success() {
                Ok(response.text().await.unwrap_or_default())
            } else {
                Err(EmailError {
                    code: "EMAIL_SEND_FAILED".to_string(),
                    message: format!("Status: {}", response.status()),
                })
            }
        }
    }
    
    fn base64_encode(data: &[u8]) -> String {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(data)
    }
}
