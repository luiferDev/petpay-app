//! Apply coupon command

use crate::application::dto::CouponResponse;
use crate::domain::entities::AppliedCoupon;
use crate::domain::errors::DomainError;
use crate::ports::repository::CouponRepository;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use std::sync::Arc;

/// Apply coupon command
pub struct ApplyCouponCommand {
    coupon_repo: Arc<dyn CouponRepository>,
}

impl ApplyCouponCommand {
    pub fn new(coupon_repo: Arc<dyn CouponRepository>) -> Self {
        Self { coupon_repo }
    }
    
    pub async fn execute(
        &self,
        code: &str,
        order_id: &str,
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
        
        coupon.is_valid(order_decimal)
            .map_err(|e| {
                let message = match e {
                    crate::domain::entities::coupon::CouponError::NotYetValid => "Coupon is not yet valid",
                    crate::domain::entities::coupon::CouponError::Expired => "Coupon has expired",
                    crate::domain::entities::coupon::CouponError::UsageLimitReached => "Coupon usage limit reached",
                    crate::domain::entities::coupon::CouponError::BelowMinimumOrder => "Order amount below minimum for coupon",
                    crate::domain::entities::coupon::CouponError::InvalidCode => "Invalid coupon code",
                };
                DomainError::ValidationError(message.to_string())
            })?;
        
        // 3. Calculate discount
        let discount = coupon.calculate_discount(order_decimal);
        let discount_f64 = discount.to_string().parse().unwrap_or(0.0);
        
        // 4. Increment coupon usage
        self.coupon_repo
            .increment_uses(coupon.id)
            .await?;
        
        // 5. Create applied coupon record
        // TODO: Save AppliedCoupon to repository
        let _applied = AppliedCoupon::new(
            coupon.id,
            order_id.to_string(),
            discount,
        );
        
        let discount_type = match coupon.discount_type {
            crate::domain::entities::DiscountType::Percentage => "PERCENTAGE",
            crate::domain::entities::DiscountType::Fixed => "FIXED",
        };
        
        Ok(CouponResponse::valid(discount_type, discount_f64))
    }
}
