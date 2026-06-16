//! Coupon repository port

use crate::domain::entities::Coupon;
use async_trait::async_trait;
use crate::domain::errors::DomainError;

/// Coupon repository trait
#[async_trait]
pub trait CouponRepository: Send + Sync {
    /// Find coupon by code
    async fn find_by_code(&self, code: &str) -> Result<Option<Coupon>, DomainError>;
    
    /// Increment coupon usage count
    async fn increment_uses(&self, id: i64) -> Result<(), DomainError>;
}
