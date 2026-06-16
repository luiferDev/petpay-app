//! Marketplace order validator - calls marketplace service to validate orders

use crate::domain::errors::DomainError;
use crate::ports::services::order_validator::{OrderValidator, OrderInfo, OrderError};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;
use std::sync::Arc;
use rust_decimal::prelude::FromPrimitive;

pub struct MarketplaceOrderValidator {
    base_url: String,
    client: Client,
}

#[derive(Debug, Deserialize)]
struct MarketplaceOrderResponse {
    id: String,
    customer_id: String,
    status: String,
    #[serde(rename = "totalAmount")]
    total_amount: f64,
    currency: String,
    #[serde(rename = "isPaid")]
    is_paid: bool,
}

impl MarketplaceOrderValidator {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl OrderValidator for MarketplaceOrderValidator {
    async fn get_order(&self, order_id: &str, customer_id: &str) -> Result<OrderInfo, OrderError> {
        let url = format!("{}/api/v1/orders/{}", self.base_url, order_id);
        
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| OrderError {
                code: "REQUEST_FAILED".to_string(),
                message: e.to_string(),
            })?;
        
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(OrderError {
                code: "ORDER_NOT_FOUND".to_string(),
                message: "Order not found".to_string(),
            });
        }
        
        if response.status() == reqwest::StatusCode::FORBIDDEN {
            return Err(OrderError {
                code: "ORDER_NOT_OWNED".to_string(),
                message: "Order does not belong to user".to_string(),
            });
        }
        
        let order: MarketplaceOrderResponse = response
            .json()
            .await
            .map_err(|e| OrderError {
                code: "PARSE_FAILED".to_string(),
                message: e.to_string(),
            })?;
        
        // Verify ownership
        if order.customer_id != customer_id {
            return Err(OrderError {
                code: "ORDER_NOT_OWNED".to_string(),
                message: "Order does not belong to user".to_string(),
            });
        }
        
        Ok(OrderInfo {
            id: order.id,
            customer_id: order.customer_id,
            status: order.status,
            total_amount: rust_decimal::Decimal::from_f64(order.total_amount)
                .unwrap_or(rust_decimal::Decimal::ZERO),
            currency: order.currency,
            is_paid: order.is_paid,
        })
    }
    
    async fn validate_order_ownership(&self, order_id: &str, customer_id: &str) -> Result<bool, OrderError> {
        match self.get_order(order_id, customer_id).await {
            Ok(_) => Ok(true),
            Err(e) if e.code == "ORDER_NOT_OWNED" => Ok(false),
            Err(e) => Err(e),
        }
    }
    
    async fn is_order_paid(&self, order_id: &str) -> Result<bool, OrderError> {
        // We need customer_id to check - this is a simplified version
        // In practice, you'd need to look up the order first
        Err(OrderError {
            code: "NOT_IMPLEMENTED".to_string(),
            message: "Use get_order instead".to_string(),
        })
    }
}
