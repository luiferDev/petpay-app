//! Coupon entity and related types

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Discount coupon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coupon {
    pub id: i64,
    pub code: String,
    pub discount_type: DiscountType,
    pub discount_value: Decimal,
    pub min_order_amount: Option<Decimal>,
    pub valid_from: DateTime<Utc>,
    pub valid_until: DateTime<Utc>,
    pub max_uses: Option<i32>,
    pub current_uses: i32,
}

/// Discount type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum DiscountType {
    Percentage,
    Fixed,
}

/// Applied coupon - record of coupon usage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppliedCoupon {
    pub id: Uuid,
    pub coupon_id: i64,
    pub order_id: String,
    pub discount_amount: Decimal,
    pub applied_at: DateTime<Utc>,
}

impl Coupon {
    /// Validate if coupon is valid
    pub fn is_valid(&self, order_amount: Decimal) -> Result<(), CouponError> {
        let now = Utc::now();

        // Check date validity
        if now < self.valid_from {
            return Err(CouponError::NotYetValid);
        }
        if now > self.valid_until {
            return Err(CouponError::Expired);
        }

        // Check usage limit
        if let Some(max) = self.max_uses {
            if self.current_uses >= max {
                return Err(CouponError::UsageLimitReached);
            }
        }

        // Check minimum order amount
        if let Some(min_amount) = self.min_order_amount {
            if order_amount < min_amount {
                return Err(CouponError::BelowMinimumOrder);
            }
        }

        Ok(())
    }

    /// Calculate discount amount
    pub fn calculate_discount(&self, order_amount: Decimal) -> Decimal {
        match self.discount_type {
            DiscountType::Percentage => {
                let percentage = self.discount_value / Decimal::from(100);
                order_amount * percentage
            }
            DiscountType::Fixed => {
                // Don't exceed order amount
                if self.discount_value > order_amount {
                    order_amount
                } else {
                    self.discount_value
                }
            }
        }
    }
}

impl AppliedCoupon {
    /// Create a new applied coupon record
    pub fn new(coupon_id: i64, order_id: String, discount_amount: Decimal) -> Self {
        Self {
            id: Uuid::new_v4(),
            coupon_id,
            order_id,
            discount_amount,
            applied_at: Utc::now(),
        }
    }
}

/// Coupon validation errors
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CouponError {
    NotYetValid,
    Expired,
    UsageLimitReached,
    BelowMinimumOrder,
    InvalidCode,
}

impl std::fmt::Display for CouponError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CouponError::NotYetValid => write!(f, "Coupon is not yet valid"),
            CouponError::Expired => write!(f, "Coupon has expired"),
            CouponError::UsageLimitReached => write!(f, "Coupon usage limit reached"),
            CouponError::BelowMinimumOrder => write!(f, "Order amount below minimum for coupon"),
            CouponError::InvalidCode => write!(f, "Invalid coupon code"),
        }
    }
}

impl std::error::Error for CouponError {}
