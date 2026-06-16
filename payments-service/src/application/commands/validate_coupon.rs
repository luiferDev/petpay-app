//! Validate coupon command

use crate::application::dto::CouponResponse;
use crate::domain::entities::coupon::CouponError;
use crate::domain::errors::DomainError;
use crate::ports::repository::CouponRepository;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use std::sync::Arc;

/// Validate coupon command
pub struct ValidateCouponCommand {
    coupon_repo: Arc<dyn CouponRepository>,
}

impl ValidateCouponCommand {
    pub fn new(coupon_repo: Arc<dyn CouponRepository>) -> Self {
        Self { coupon_repo }
    }
    
    pub async fn execute(
        &self,
        code: &str,
        order_amount: f64,
    ) -> Result<CouponResponse, DomainError> {
        // 1. Find coupon by code
        let coupon = self.coupon_repo
            .find_by_code(code)
            .await?
            .ok_or_else(|| DomainError::ValidationError("Invalid coupon code".to_string()))?;
        
        // 2. Validate coupon
        let order_decimal = Decimal::from_f64(order_amount)
            .ok_or_else(|| DomainError::ValidationError("Invalid order amount".to_string()))?;
        
        match coupon.is_valid(order_decimal) {
            Ok(()) => {
                let discount = coupon.calculate_discount(order_decimal);
                let discount_f64 = discount.to_string().parse().unwrap_or(0.0);
                
                let discount_type = match coupon.discount_type {
                    crate::domain::entities::DiscountType::Percentage => "PERCENTAGE",
                    crate::domain::entities::DiscountType::Fixed => "FIXED",
                };
                
                Ok(CouponResponse::valid(discount_type, discount_f64))
            }
            Err(e) => {
                let message = match e {
                    CouponError::NotYetValid => "Coupon is not yet valid",
                    CouponError::Expired => "Coupon has expired",
                    CouponError::UsageLimitReached => "Coupon usage limit reached",
                    CouponError::BelowMinimumOrder => "Order amount below minimum for coupon",
                    CouponError::InvalidCode => "Invalid coupon code",
                };
                
                Ok(CouponResponse::invalid(message))
            }
        }
    }
}
