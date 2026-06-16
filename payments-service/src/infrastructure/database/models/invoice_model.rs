//! Invoice model for SeaORM

use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "invoices")]
pub struct Model {
    #[sea_orm(column_name = "id")]
    #[sea_orm(primary_key)]
    pub id: Uuid,

    #[sea_orm(column_name = "invoice_number", unique)]
    pub invoice_number: String,

    #[sea_orm(column_name = "payment_id")]
    pub payment_id: Uuid,

    #[sea_orm(column_name = "customer_id")]
    pub customer_id: String,

    #[sea_orm(column_name = "customer_name")]
    pub customer_name: String,

    #[sea_orm(column_name = "customer_email")]
    pub customer_email: String,

    #[sea_orm(column_name = "subtotal")]
    pub subtotal: Decimal,

    #[sea_orm(column_name = "tax")]
    pub tax: Decimal,

    #[sea_orm(column_name = "discount")]
    pub discount: Decimal,

    #[sea_orm(column_name = "total")]
    pub total: Decimal,

    #[sea_orm(column_name = "status")]
    pub status: String,

    #[sea_orm(column_name = "pdf_path")]
    #[sea_orm(nullable)]
    pub pdf_path: Option<String>,

    #[sea_orm(column_name = "created_at")]
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
