//! Create payment request DTO

use crate::domain::entities::PaymentMethod;
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreatePaymentRequest {
    #[serde(rename = "orderId")]
    pub order_id: String,

    #[serde(rename = "paymentMethod")]
    pub payment_method: PaymentMethod,

    #[serde(rename = "providerToken")]
    pub provider_token: Option<String>,
}

impl CreatePaymentRequest {
    pub fn order_id(&self) -> &str {
        &self.order_id
    }

    pub fn payment_method(&self) -> PaymentMethod {
        self.payment_method
    }

    pub fn provider_token(&self) -> Option<&str> {
        self.provider_token.as_deref()
    }
}
