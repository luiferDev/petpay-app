use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl ApiError {
    pub fn not_found(resource: &str, id: &str) -> Self {
        Self {
            code: "NOT_FOUND".into(),
            message: format!("{} not found: {}", resource, id),
            details: None,
        }
    }

    pub fn validation(msg: &str) -> Self {
        Self {
            code: "VALIDATION_ERROR".into(),
            message: msg.into(),
            details: None,
        }
    }

    pub fn internal(msg: &str) -> Self {
        Self {
            code: "INTERNAL_ERROR".into(),
            message: msg.into(),
            details: None,
        }
    }

    pub fn unauthorized(msg: &str) -> Self {
        Self {
            code: "UNAUTHORIZED".into(),
            message: msg.into(),
            details: None,
        }
    }

    pub fn conflict(msg: &str) -> Self {
        Self {
            code: "CONFLICT".into(),
            message: msg.into(),
            details: None,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self.code.as_str() {
            "NOT_FOUND" => StatusCode::NOT_FOUND,
            "VALIDATION_ERROR" => StatusCode::BAD_REQUEST,
            "CONFLICT" => StatusCode::CONFLICT,
            "UNAUTHORIZED" => StatusCode::UNAUTHORIZED,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(self)).into_response()
    }
}
