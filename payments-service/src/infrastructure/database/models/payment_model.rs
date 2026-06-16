//! Payment model for SeaORM

use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "payments")]
pub struct Model {
    #[sea_orm(column_name = "id")]
    #[sea_orm(primary_key)]
    pub id: Uuid,

    #[sea_orm(column_name = "order_id")]
    pub order_id: String,

    #[sea_orm(column_name = "customer_id")]
    pub customer_id: String,

    #[sea_orm(column_name = "amount")]
    pub amount: Decimal,

    #[sea_orm(column_name = "currency")]
    pub currency: String,

    #[sea_orm(column_name = "method")]
    pub method: String,

    #[sea_orm(column_name = "status")]
    pub status: String,

    #[sea_orm(column_name = "provider_payment_id")]
    #[sea_orm(nullable)]
    pub provider_payment_id: Option<String>,

    #[sea_orm(column_name = "created_at")]
    pub created_at: DateTimeUtc,

    #[sea_orm(column_name = "updated_at")]
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
