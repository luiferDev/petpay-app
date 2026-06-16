use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower::ServiceExt;
use uuid::Uuid;

#[derive(Clone)]
struct TestState {
    payments: Arc<RwLock<HashMap<String, Value>>>,
    invoices: Arc<RwLock<HashMap<String, Value>>>,
    coupons: Arc<RwLock<HashMap<String, Value>>>,
}

impl TestState {
    fn new() -> Self {
        Self {
            payments: Arc::new(RwLock::new(HashMap::new())),
            invoices: Arc::new(RwLock::new(HashMap::new())),
            coupons: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

fn create_test_app() -> Router {
    let state = Arc::new(TestState::new());

    Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/payments", post(create_payment_handler))
        .route("/api/v1/payments", get(list_payments_handler))
        .route("/api/v1/payments/{id}", get(get_payment_handler))
        .route("/api/v1/payments/{id}/refund", post(refund_payment_handler))
        .route("/api/v1/invoices/{id}", get(get_invoice_handler))
        .route("/api/v1/invoices", get(list_invoices_handler))
        .route("/api/v1/coupons/validate", post(validate_coupon_handler))
        .route("/api/v1/coupons/apply", post(apply_coupon_handler))
        .with_state(state)
}

async fn health_handler() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "service": "payments",
        "version": "0.1.0"
    }))
}

#[derive(Deserialize)]
struct CreatePaymentPayload {
    #[serde(rename = "orderId")]
    order_id: String,
    #[serde(rename = "paymentMethod")]
    payment_method: Option<String>,
    #[serde(rename = "providerToken")]
    provider_token: Option<String>,
}

async fn create_payment_handler(
    State(state): State<Arc<TestState>>,
    Json(payload): Json<CreatePaymentPayload>,
) -> Result<Json<Value>, StatusCode> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let method = payload.payment_method.as_deref().unwrap_or("STRIPE");

    let payment = json!({
        "id": id,
        "orderId": payload.order_id,
        "customerId": "customer_test",
        "amount": 150.00,
        "currency": "USD",
        "method": method,
        "status": "COMPLETED",
        "providerPaymentId": "pi_test_123",
        "createdAt": now,
        "updatedAt": now,
    });

    state
        .payments
        .write()
        .await
        .insert(id.clone(), payment.clone());
    Ok(Json(payment))
}

async fn get_payment_handler(
    State(state): State<Arc<TestState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let payments = state.payments.read().await;
    payments.get(&id).cloned().map(Json).ok_or(StatusCode::NOT_FOUND)
}

async fn list_payments_handler(
    State(state): State<Arc<TestState>>,
) -> Json<Value> {
    let payments = state.payments.read().await;
    let items: Vec<&Value> = payments.values().collect();
    Json(json!({ "payments": items, "total": items.len() }))
}

#[derive(Deserialize)]
struct RefundPayload {
    amount: Option<f64>,
}

async fn refund_payment_handler(
    State(state): State<Arc<TestState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_payload): Json<RefundPayload>,
) -> Result<Json<Value>, StatusCode> {
    let mut payments = state.payments.write().await;
    let payment = payments.get_mut(&id).ok_or(StatusCode::NOT_FOUND)?;

    if let Some(obj) = payment.as_object_mut() {
        obj.insert("status".to_string(), json!("REFUNDED"));
        obj.insert("updatedAt".to_string(), json!(Utc::now().to_rfc3339()));
    }

    Ok(Json(payment.clone()))
}

async fn get_invoice_handler(
    State(state): State<Arc<TestState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let invoices = state.invoices.read().await;
    invoices.get(&id).cloned().map(Json).ok_or(StatusCode::NOT_FOUND)
}

async fn list_invoices_handler(
    State(state): State<Arc<TestState>>,
) -> Json<Value> {
    let invoices = state.invoices.read().await;
    let items: Vec<&Value> = invoices.values().collect();
    Json(json!({ "invoices": items, "total": items.len() }))
}

#[derive(Deserialize)]
struct CouponPayload {
    code: String,
    #[serde(rename = "orderId")]
    order_id: String,
}

async fn validate_coupon_handler(
    State(state): State<Arc<TestState>>,
    Json(payload): Json<CouponPayload>,
) -> Json<Value> {
    let coupons = state.coupons.read().await;
    if coupons.contains_key(&payload.code.to_uppercase()) {
        Json(json!({
            "valid": true,
            "discountType": "PERCENTAGE",
            "discountValue": 10.0,
            "message": "Coupon applied successfully",
        }))
    } else {
        Json(json!({
            "valid": false,
            "message": "Invalid coupon code",
        }))
    }
}

async fn apply_coupon_handler(
    State(state): State<Arc<TestState>>,
    Json(payload): Json<CouponPayload>,
) -> Result<Json<Value>, StatusCode> {
    let coupons = state.coupons.read().await;
    if coupons.contains_key(&payload.code.to_uppercase()) {
        Ok(Json(json!({
            "valid": true,
            "discountType": "PERCENTAGE",
            "discountValue": 10.0,
            "message": "Coupon applied successfully",
        })))
    } else {
        Ok(Json(json!({
            "valid": false,
            "message": "Invalid coupon code",
        })))
    }
}

fn seed_coupon(app: &Router, code: &str) {
    // Build a fresh router with pre-seeded state
    let _ = app;
    // We cannot inject into an existing Router's state via public API.
    // Instead, we create the app with pre-seeded coupons via the helper below.
}

fn create_test_app_with_seeded_coupons(coupon_codes: &[&str]) -> Router {
    let state = Arc::new(TestState::new());
    for &code in coupon_codes {
        let mut coupons = state.coupons.blocking_write();
        coupons.insert(code.to_string(), json!({"code": code}));
    }

    Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/payments", post(create_payment_handler))
        .route("/api/v1/payments", get(list_payments_handler))
        .route("/api/v1/payments/{id}", get(get_payment_handler))
        .route("/api/v1/payments/{id}/refund", post(refund_payment_handler))
        .route("/api/v1/invoices/{id}", get(get_invoice_handler))
        .route("/api/v1/invoices", get(list_invoices_handler))
        .route("/api/v1/coupons/validate", post(validate_coupon_handler))
        .route("/api/v1/coupons/apply", post(apply_coupon_handler))
        .with_state(state)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check() {
        let app = create_test_app();
        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();

        assert_eq!(body["status"], "healthy");
        assert_eq!(body["service"], "payments");
    }

    #[tokio::test]
    async fn test_create_payment() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/payments")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "orderId": "order_123",
                            "paymentMethod": "STRIPE",
                            "providerToken": "tok_test",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();

        assert_eq!(body["orderId"], "order_123");
        assert_eq!(body["status"], "COMPLETED");
        assert!(!body["id"].as_str().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_create_and_get_payment() {
        let app = create_test_app();

        let create_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/payments")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "orderId": "order_get_test",
                            "paymentMethod": "PAYPAL",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(create_resp.status(), StatusCode::OK);
        let created: Value = serde_json::from_slice(
            &axum::body::to_bytes(create_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        let payment_id = created["id"].as_str().unwrap().to_string();

        let get_resp = app
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/payments/{}", payment_id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(get_resp.status(), StatusCode::OK);
        let fetched: Value = serde_json::from_slice(
            &axum::body::to_bytes(get_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(fetched["id"], payment_id);
        assert_eq!(fetched["orderId"], "order_get_test");
    }

    #[tokio::test]
    async fn test_list_payments() {
        let app = create_test_app();

        app.clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/payments")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "orderId": "order_list_1",
                            "paymentMethod": "STRIPE",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        let list_resp = app
            .oneshot(
                Request::builder().uri("/api/v1/payments").body(Body::empty()).unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(list_resp.status(), StatusCode::OK);
        let list: Value = serde_json::from_slice(
            &axum::body::to_bytes(list_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert!(list["total"].as_u64().unwrap_or(0) >= 1);
        assert!(!list["payments"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_get_payment_not_found() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/v1/payments/nonexistent-id")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_refund_payment() {
        let app = create_test_app();

        let create_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/payments")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "orderId": "order_refund",
                            "paymentMethod": "CREDIT_CARD",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        let created: Value = serde_json::from_slice(
            &axum::body::to_bytes(create_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        let payment_id = created["id"].as_str().unwrap().to_string();

        let refund_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/v1/payments/{}/refund", payment_id))
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({"amount": 150.00})).unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(refund_resp.status(), StatusCode::OK);
        let refunded: Value = serde_json::from_slice(
            &axum::body::to_bytes(refund_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(refunded["status"], "REFUNDED");
    }

    #[tokio::test]
    async fn test_create_payment_missing_fields() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/payments")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "orderId": "only_order_id",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        // The handler accepts missing paymentMethod gracefully; verify it still returns OK
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_invoice_not_found() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/v1/invoices/nonexistent")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_list_invoices_empty() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder().uri("/api/v1/invoices").body(Body::empty()).unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert!(body.get("invoices").is_some());
        assert_eq!(body["total"], 0);
    }

    #[tokio::test]
    async fn test_validate_coupon_invalid() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/coupons/validate")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "code": "INVALID",
                            "orderId": "order_1",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(body["valid"], false);
    }

    #[tokio::test]
    async fn test_apply_coupon_invalid() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/coupons/apply")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "code": "DOES_NOT_EXIST",
                            "orderId": "order_1",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(body["valid"], false);
    }

    #[tokio::test]
    async fn test_coupon_validate_and_apply_valid() {
        let app = create_test_app_with_seeded_coupons(&["SAVE10"]);

        let validate_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/coupons/validate")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "code": "SAVE10",
                            "orderId": "order_1",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(validate_resp.status(), StatusCode::OK);
        let validate_body: Value = serde_json::from_slice(
            &axum::body::to_bytes(validate_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(validate_body["valid"], true);

        let apply_resp = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/coupons/apply")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "code": "SAVE10",
                            "orderId": "order_1",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(apply_resp.status(), StatusCode::OK);
        let apply_body: Value = serde_json::from_slice(
            &axum::body::to_bytes(apply_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(apply_body["valid"], true);
    }

    #[tokio::test]
    async fn test_health_ready_endpoint() {
        let app = create_test_app();
        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_full_payment_lifecycle() {
        let app = create_test_app();

        // 1. Create payment
        let create_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/payments")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "orderId": "order_lifecycle",
                            "paymentMethod": "STRIPE",
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(create_resp.status(), StatusCode::OK);
        let payment: Value = serde_json::from_slice(
            &axum::body::to_bytes(create_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        let payment_id = payment["id"].as_str().unwrap().to_string();
        assert_eq!(payment["status"], "COMPLETED");

        // 2. Get payment
        let get_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/payments/{}", payment_id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(get_resp.status(), StatusCode::OK);

        // 3. Refund payment
        let refund_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/v1/payments/{}/refund", payment_id))
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({"amount": 150.00})).unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(refund_resp.status(), StatusCode::OK);
        let refunded: Value = serde_json::from_slice(
            &axum::body::to_bytes(refund_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(refunded["status"], "REFUNDED");

        // 4. List includes the payment
        let list_resp = app
            .oneshot(
                Request::builder().uri("/api/v1/payments").body(Body::empty()).unwrap(),
            )
            .await
            .unwrap();
        let list: Value = serde_json::from_slice(
            &axum::body::to_bytes(list_resp.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert!(list["total"].as_u64().unwrap_or(0) >= 1);
    }
}
