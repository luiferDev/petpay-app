//! Application state shared across handlers

use axum::extract::FromRef;

use crate::infrastructure::email::identity_client::IdentityEmailClient;
use crate::infrastructure::payment::paypal_provider::PayPalProvider;
use crate::infrastructure::payment::stripe_provider::StripeProvider;
use crate::infrastructure::repositories::{
    PostgresCouponRepository, PostgresInvoiceRepository, PostgresPaymentRepository,
};
use crate::infrastructure::validators::marketplace_validator::MarketplaceOrderValidator;
use crate::middleware::auth::JwtSecret;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub payment_repo: Arc<PostgresPaymentRepository>,
    pub invoice_repo: Arc<PostgresInvoiceRepository>,
    pub coupon_repo: Arc<PostgresCouponRepository>,
    pub stripe_provider: Arc<StripeProvider>,
    pub paypal_provider: Arc<PayPalProvider>,
    pub email_client: Arc<IdentityEmailClient>,
    pub marketplace_validator: Arc<MarketplaceOrderValidator>,
    pub jwt_secret: JwtSecret,
}

impl FromRef<AppState> for JwtSecret {
    fn from_ref(state: &AppState) -> Self {
        state.jwt_secret.clone()
    }
}
