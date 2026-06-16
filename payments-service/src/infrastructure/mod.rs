//! Infrastructure module - implementations of ports

pub mod config;
pub mod database;
pub mod http;
pub mod messaging;
pub mod pdf;
pub mod email;
pub mod payment;
pub mod validators;

// Re-export for convenience
pub use database::repositories;
pub use payment::stripe_provider::StripeProvider;
pub use payment::paypal_provider::PayPalProvider;
pub use email::identity_client::IdentityEmailClient;
pub use validators::marketplace_validator::MarketplaceOrderValidator;
