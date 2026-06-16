//! Order validator trait

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;

/// Order information from marketplace
#[derive(Debug, Serialize, Deserialize)]
pub struct OrderInfo {
    pub id: String,
    pub customer_id: String,
    pub status: String,
    pub total_amount: Decimal,
    pub currency: String,
    pub is_paid: bool,
}

/// Order validator error
#[derive(Debug, Serialize, Deserialize)]
pub struct OrderError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for OrderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for OrderError {}

/// Order validator trait (validates orders from marketplace service)
#[async_trait]
pub trait OrderValidator: Send + Sync {
    /// Get order by ID
    async fn get_order(&self, order_id: &str, customer_id: &str) -> Result<OrderInfo, OrderError>;
    
    /// Check if order belongs to customer
    async fn validate_order_ownership(&self, order_id: &str, customer_id: &str) -> Result<bool, OrderError>;
    
    /// Check if order is already paid
    async fn is_order_paid(&self, order_id: &str) -> Result<bool, OrderError>;
}
