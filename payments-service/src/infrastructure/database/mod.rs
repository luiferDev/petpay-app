//! Database module - SeaORM integration

pub mod models;
pub mod migrations;
pub mod repositories;

use sea_orm::DbConn;
use sea_orm_migration::MigratorTrait;

/// Database connection wrapper
pub struct Database {
    pub conn: DbConn,
}

impl Database {
    /// Create a new database connection
    pub async fn new(database_url: &str) -> Result<Self, sea_orm::DbErr> {
        let conn = sea_orm::Database::connect(database_url).await?;
        Ok(Self { conn })
    }

    /// Run database migrations
    pub async fn run_migrations(&self) -> Result<(), sea_orm::DbErr> {
        tracing::info!("Running database migrations...");
        Migrator::up(&self.conn, None).await?;
        Ok(())
    }
}

/// Get a reference to the database connection
impl std::ops::Deref for Database {
    type Target = DbConn;

    fn deref(&self) -> &Self::Target {
        &self.conn
    }
}

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn sea_orm_migration::MigrationTrait>> {
        vec![
            Box::new(migrations::m001_create_payments::Migration),
            Box::new(migrations::m002_create_invoices::Migration),
            Box::new(migrations::m003_create_coupons::Migration),
        ]
    }
}
