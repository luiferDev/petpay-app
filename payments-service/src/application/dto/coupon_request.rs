//! Coupon request/response DTOs

use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct ValidateCouponRequest {
    pub code: String,
    #[serde(rename = "orderId")]
    pub order_id: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ApplyCouponRequest {
    pub code: String,
    #[serde(rename = "orderId")]
    pub order_id: String,
}

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CouponResponse {
    pub valid: bool,
    #[serde(rename = "discountType")]
    pub discount_type: Option<String>,
    #[serde(rename = "discountValue")]
    pub discount_value: Option<f64>,
    pub message: Option<String>,
}

impl CouponResponse {
    pub fn valid(discount_type: &str, discount_value: f64) -> Self {
        Self {
            valid: true,
            discount_type: Some(discount_type.to_string()),
            discount_value: Some(discount_value),
            message: Some("Coupon applied successfully".to_string()),
        }
    }

    pub fn invalid(message: &str) -> Self {
        Self {
            valid: false,
            discount_type: None,
            discount_value: None,
            message: Some(message.to_string()),
        }
    }
}
