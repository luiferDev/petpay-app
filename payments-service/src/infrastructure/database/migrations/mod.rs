//! Database migrations module

pub use sea_orm_migration::prelude::*;

#[path = "001_create_payments.rs"]
pub mod m001_create_payments;
#[path = "002_create_invoices.rs"]
pub mod m002_create_invoices;
#[path = "003_create_coupons.rs"]
pub mod m003_create_coupons;
