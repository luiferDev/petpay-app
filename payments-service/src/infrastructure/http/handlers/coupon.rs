//! Coupon handlers

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};

use super::AppState;
use crate::application::commands::{ValidateCouponCommand, ApplyCouponCommand};
use crate::application::dto::{ValidateCouponRequest, CouponResponse};

pub async fn validate_coupon(
    State(state): State<AppState>,
    Json(payload): Json<ValidateCouponRequest>,
) -> Result<Json<CouponResponse>, StatusCode> {
    // For now, use a default order amount
    let order_amount = 100.0;
    
    let command = ValidateCouponCommand::new(state.coupon_repo.clone());
    
    match command.execute(&payload.code, order_amount).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Validate coupon failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}

pub async fn apply_coupon(
    State(state): State<AppState>,
    Json(payload): Json<ValidateCouponRequest>,
) -> Result<Json<CouponResponse>, StatusCode> {
    // For now, use a default order amount
    let order_amount = 100.0;
    
    let command = ApplyCouponCommand::new(state.coupon_repo.clone());
    
    match command.execute(&payload.code, &payload.order_id, order_amount).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Apply coupon failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}
