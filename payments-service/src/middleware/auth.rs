use axum::{
    extract::{FromRef, FromRequestParts, Request, State},
    http::{request::Parts, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub id: i64,
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Serialize)]
pub struct AuthError {
    pub code: String,
    pub message: String,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let status = match self.code.as_str() {
            "UNAUTHORIZED" => StatusCode::UNAUTHORIZED,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(self)).into_response()
    }
}

#[derive(Clone)]
pub struct JwtSecret(pub Arc<String>);

impl JwtSecret {
    pub fn new(secret: String) -> Self {
        Self(Arc::new(secret))
    }

    pub fn decoding_key(&self) -> DecodingKey {
        DecodingKey::from_secret(self.0.as_bytes())
    }
}

fn validate_token(headers: &axum::http::HeaderMap, jwt_secret: &JwtSecret) -> Result<Claims, AuthError> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AuthError {
            code: "UNAUTHORIZED".to_string(),
            message: "Missing Authorization header".to_string(),
        })?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AuthError {
            code: "UNAUTHORIZED".to_string(),
            message: "Invalid Authorization header format".to_string(),
        })?;

    let token_data = decode::<Claims>(
        token,
        &jwt_secret.decoding_key(),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| AuthError {
        code: "UNAUTHORIZED".to_string(),
        message: "Invalid or expired token".to_string(),
    })?;

    Ok(token_data.claims)
}

/// Middleware layer for protecting route groups.
/// Validates JWT and inserts Claims into request extensions.
pub async fn require_auth(
    State(jwt_secret): State<JwtSecret>,
    mut request: Request,
    next: Next,
) -> Result<Response, AuthError> {
    let claims = validate_token(request.headers(), &jwt_secret)?;
    request.extensions_mut().insert(claims);
    Ok(next.run(request).await)
}

impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
    JwtSecret: FromRef<S>,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let jwt_secret = JwtSecret::from_ref(state);
        validate_token(&parts.headers, &jwt_secret)
    }
}
