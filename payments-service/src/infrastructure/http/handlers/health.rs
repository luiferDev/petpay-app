//! Health check handlers

use axum::{
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
}

/// Basic health check endpoint
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "payments".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Readiness check (includes database connectivity)
pub async fn health_ready() -> Result<Json<HealthResponse>, StatusCode> {
    // TODO: Check database connectivity before returning ready
    Ok(Json(HealthResponse {
        status: "ready".to_string(),
        service: "payments".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }))
}
