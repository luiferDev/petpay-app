//! Payment handlers

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use super::AppState;
use crate::application::commands::ProcessPaymentCommand;
use crate::application::queries::{GetPaymentQuery, ListPaymentsQuery};
use crate::application::dto::{CreatePaymentRequest, PaymentResponse, PaymentListResponse};
use crate::middleware::auth::Claims;

pub async fn create_payment(
    State(state): State<AppState>,
    claims: Claims,
    Json(payload): Json<CreatePaymentRequest>,
) -> Result<Json<PaymentResponse>, StatusCode> {
    let customer_id = claims.id.to_string();
    let customer_email = claims.email.clone();
    let customer_name = claims.email.clone();

    // Create command
    let command = ProcessPaymentCommand::new(
        state.payment_repo.clone(),
        state.stripe_provider.clone(),
        state.email_client.clone(),
        state.marketplace_validator.clone(),
    );

    match command.execute(&payload, &customer_id, &customer_email, &customer_name).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Payment failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}

pub async fn get_payment(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<String>,
) -> Result<Json<PaymentResponse>, StatusCode> {
    let customer_id = claims.email;
    
    let query = GetPaymentQuery::new(state.payment_repo.clone());
    
    match query.execute(&id, &customer_id).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Get payment failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}

pub async fn list_payments(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<PaymentListResponse>, StatusCode> {
    let customer_id = claims.email;
    
    let query = ListPaymentsQuery::new(state.payment_repo.clone());
    
    match query.execute(&customer_id).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("List payments failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}
