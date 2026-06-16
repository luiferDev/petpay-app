//! Configuration module

use config::ConfigError;
use serde::Deserialize;

/// App configuration
#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub stripe: StripeConfig,
    pub paypal: PayPalConfig,
    pub identity: IdentityConfig,
    pub marketplace: MarketplaceConfig,
    pub pdf: PdfConfig,
    pub rabbitmq: RabbitMQConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    #[serde(default = "default_port")]
    pub port: u16,
    pub host: String,
}

fn default_port() -> u16 {
    8083
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct JwtConfig {
    pub secret: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct StripeConfig {
    pub api_key: String,
    pub webhook_secret: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PayPalConfig {
    pub client_id: String,
    pub client_secret: String,
    pub mode: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct IdentityConfig {
    pub service_url: String,
    pub service_api_key: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct MarketplaceConfig {
    pub service_url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PdfConfig {
    #[serde(default = "default_pdf_path")]
    pub storage_path: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct RabbitMQConfig {
    #[serde(default = "default_rabbitmq_url")]
    pub url: String,
}

fn default_pdf_path() -> String {
    "/app/pdfs".to_string()
}

fn default_rabbitmq_url() -> String {
    "amqp://guest:guest@localhost:5672".to_string()
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        // Read from environment variables
        // Expected env vars: APP_SERVER__PORT, APP_SERVER__HOST, APP_DATABASE__URL, etc.
        // Or with underscore: APP_SERVER_PORT, APP_SERVER_HOST, APP_DATABASE_URL

        let server_port = std::env::var("APP_SERVER_PORT")
            .or_else(|_| std::env::var("SERVER_PORT"))
            .or_else(|_| std::env::var("PORT"))
            .unwrap_or_else(|_| "8083".to_string())
            .parse()
            .map_err(|_| ConfigError::Message("Invalid server port".to_string()))?;

        let server_host = std::env::var("APP_SERVER_HOST")
            .or_else(|_| std::env::var("SERVER_HOST"))
            .or_else(|_| std::env::var("HOST"))
            .unwrap_or_else(|_| "0.0.0.0".to_string());

        let database_url = std::env::var("APP_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .map_err(|_| ConfigError::Message("DATABASE_URL not set".to_string()))?;

        let jwt_secret = std::env::var("APP_JWT_SECRET")
            .or_else(|_| std::env::var("JWT_SECRET"))
            .map_err(|_| ConfigError::Message("JWT_SECRET not set".to_string()))?;

        let stripe_api_key = std::env::var("APP_STRIPE_API_KEY")
            .or_else(|_| std::env::var("STRIPE_API_KEY"))
            .unwrap_or_default();

        let stripe_webhook_secret = std::env::var("APP_STRIPE_WEBHOOK_SECRET")
            .or_else(|_| std::env::var("STRIPE_WEBHOOK_SECRET"))
            .ok();

        let paypal_client_id = std::env::var("APP_PAYPAL_CLIENT_ID")
            .or_else(|_| std::env::var("PAYPAL_CLIENT_ID"))
            .unwrap_or_default();

        let paypal_client_secret = std::env::var("APP_PAYPAL_CLIENT_SECRET")
            .or_else(|_| std::env::var("PAYPAL_CLIENT_SECRET"))
            .unwrap_or_default();

        let paypal_mode = std::env::var("APP_PAYPAL_MODE")
            .or_else(|_| std::env::var("PAYPAL_MODE"))
            .unwrap_or_else(|_| "sandbox".to_string());

        let identity_service_url = std::env::var("APP_IDENTITY_SERVICE_URL")
            .or_else(|_| std::env::var("IDENTITY_SERVICE_URL"))
            .unwrap_or_else(|_| "http://identity:3000".to_string());

        let identity_service_api_key = std::env::var("APP_IDENTITY_SERVICE_API_KEY")
            .or_else(|_| std::env::var("IDENTITY_SERVICE_API_KEY"))
            .unwrap_or_default();

        let marketplace_service_url = std::env::var("APP_MARKETPLACE_SERVICE_URL")
            .or_else(|_| std::env::var("MARKETPLACE_SERVICE_URL"))
            .unwrap_or_else(|_| "http://marketplace:8080".to_string());

        let pdf_storage_path = std::env::var("APP_PDF_STORAGE_PATH")
            .or_else(|_| std::env::var("PDF_STORAGE_PATH"))
            .unwrap_or_else(|_| "/app/pdfs".to_string());

        let rabbitmq_url = std::env::var("APP_RABBITMQ_URL")
            .or_else(|_| std::env::var("RABBITMQ_URL"))
            .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672".to_string());

        Ok(AppConfig {
            server: ServerConfig {
                port: server_port,
                host: server_host,
            },
            database: DatabaseConfig { url: database_url },
            jwt: JwtConfig { secret: jwt_secret },
            stripe: StripeConfig {
                api_key: stripe_api_key,
                webhook_secret: stripe_webhook_secret,
            },
            paypal: PayPalConfig {
                client_id: paypal_client_id,
                client_secret: paypal_client_secret,
                mode: paypal_mode,
            },
            identity: IdentityConfig {
                service_url: identity_service_url,
                service_api_key: identity_service_api_key,
            },
            marketplace: MarketplaceConfig {
                service_url: marketplace_service_url,
            },
            pdf: PdfConfig {
                storage_path: pdf_storage_path,
            },
            rabbitmq: RabbitMQConfig {
                url: rabbitmq_url,
            },
        })
    }
}
