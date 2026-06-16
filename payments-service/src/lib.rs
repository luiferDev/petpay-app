//! Payment & Invoice Microservice for Petpay Platform
//! 
//! This is the main library crate containing all modules for the payments service.

pub mod domain;
pub mod ports;
pub mod application;
pub mod infrastructure;
pub mod middleware;

// Re-export commonly used types
pub use domain::entities::{Payment, Invoice, Coupon};

/// Application entry point initialization
pub mod init {
    use crate::infrastructure::database;
    use sea_orm::DbErr;
    
    /// Initialize the database connection
    pub async fn init_database(database_url: &str) -> Result<database::Database, DbErr> {
        database::Database::new(database_url).await
    }
}
