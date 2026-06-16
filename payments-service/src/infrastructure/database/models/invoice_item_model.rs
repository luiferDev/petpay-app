//! Invoice item model for SeaORM

use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "invoice_items")]
pub struct Model {
    #[sea_orm(column_name = "id")]
    #[sea_orm(primary_key)]
    pub id: Uuid,

    #[sea_orm(column_name = "invoice_id")]
    pub invoice_id: Uuid,

    #[sea_orm(column_name = "description")]
    pub description: String,

    #[sea_orm(column_name = "quantity")]
    pub quantity: i32,

    #[sea_orm(column_name = "unit_price")]
    pub unit_price: Decimal,

    #[sea_orm(column_name = "total")]
    pub total: Decimal,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::invoice_model::Entity",
        from = "Column::InvoiceId",
        to = "super::invoice_model::Column::Id"
    )]
    Invoice,
}

impl ActiveModelBehavior for ActiveModel {}
