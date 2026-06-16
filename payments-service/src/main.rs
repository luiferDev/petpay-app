//! Payment & Invoice Microservice - Main Entry Point
//!
//! Run with: cargo run --bin payments-service

use axum::{
    Router,
    routing::{get, post},
};
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use std::sync::Arc;

mod domain;
mod ports;
mod application;
mod infrastructure;
mod middleware;
mod error;

use infrastructure::http::handlers::{health, payment, invoice, coupon, AppState};
use infrastructure::database::Database;
use infrastructure::repositories::{PostgresPaymentRepository, PostgresInvoiceRepository, PostgresCouponRepository};
use infrastructure::payment::stripe_provider::StripeProvider;
use infrastructure::payment::paypal_provider::PayPalProvider;
use infrastructure::email::identity_client::IdentityEmailClient;
use infrastructure::validators::marketplace_validator::MarketplaceOrderValidator;
use middleware::auth::JwtSecret;

#[tokio::main]
async fn main() {
    tracing::info!("Starting payments-service...");
    
    // Initialize logging
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Logging initialized, loading config...");
    
    // Load configuration - exit with error if config is invalid
    let config = infrastructure::config::AppConfig::from_env()
        .unwrap_or_else(|e| {
            tracing::error!("Failed to load configuration: {}", e);
            std::process::exit(1);
        });

    tracing::info!("Config loaded: {:?}", config.server);

    // Start RabbitMQ event consumer (non-blocking)
    let mut event_consumer = infrastructure::messaging::EventConsumer::new();
    if let Err(e) = event_consumer.start(&config.rabbitmq.url).await {
        tracing::warn!("Failed to start RabbitMQ consumer: {}. Events will not be consumed.", e);
    }

    // Initialize database - exit with error if connection fails
    let db = infrastructure::database::Database::new(&config.database.url)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            std::process::exit(1);
        });

    tracing::info!("Database connected successfully");

    // Run migrations - exit with error if migrations fail
    db.run_migrations()
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to run database migrations: {}", e);
            std::process::exit(1);
        });

    tracing::info!("Database migrations completed");

    // Create repositories
    let payment_repo = Arc::new(PostgresPaymentRepository::new(db.conn.clone()));
    let invoice_repo = Arc::new(PostgresInvoiceRepository::new(db.conn.clone()));
    let coupon_repo = Arc::new(PostgresCouponRepository::new(db.conn.clone()));

    // Create services
    let stripe_provider = Arc::new(StripeProvider::new(config.stripe.api_key.clone()));
    let paypal_provider = Arc::new(PayPalProvider::new(
        config.paypal.client_id.clone(),
        config.paypal.client_secret.clone(),
        config.paypal.mode.clone(),
    ));
    let email_client = Arc::new(IdentityEmailClient::new(
        config.identity.service_url.clone(),
        config.identity.service_api_key.clone(),
    ));
    let marketplace_validator = Arc::new(MarketplaceOrderValidator::new(
        config.marketplace.service_url.clone(),
    ));

    // Create JWT secret from config
    let jwt_secret = JwtSecret::new(config.jwt.secret.clone());

    // Create application state
    let state = AppState {
        payment_repo,
        invoice_repo,
        coupon_repo,
        stripe_provider,
        paypal_provider,
        email_client,
        marketplace_validator,
        jwt_secret: jwt_secret.clone(),
    };

    // Build router with auth middleware on protected routes
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let protected_routes = Router::new()
        // Payment routes
        .route("/api/v1/payments", post(payment::create_payment))
        .route("/api/v1/payments", get(payment::list_payments))
        .route("/api/v1/payments/{id}", get(payment::get_payment))
        
        // Invoice routes
        .route("/api/v1/invoices", get(invoice::list_invoices))
        .route("/api/v1/invoices/{id}", get(invoice::get_invoice))
        .route("/api/v1/invoices/{id}/pdf", get(invoice::download_invoice_pdf))
        
        // Coupon routes
        .route("/api/v1/coupons/validate", post(coupon::validate_coupon))
        .route("/api/v1/coupons/apply", post(coupon::apply_coupon))
        .layer(axum::middleware::from_fn_with_state(
            jwt_secret,
            crate::middleware::auth::require_auth,
        ));

    let app = Router::new()
        // Health routes (public, no auth)
        .route("/health", get(health::health_check))
        .route("/health/ready", get(health::health_ready))
        
        // Protected API routes
        .merge(protected_routes)
        .layer(cors)
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.server.port));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to bind to port {}: {}", addr, e);
            std::process::exit(1);
        });

    axum::serve(listener, app)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to start server: {}", e);
            std::process::exit(1);
        });
}
