//! Applied coupon model for SeaORM

use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "applied_coupons")]
pub struct Model {
    #[sea_orm(column_name = "id")]
    #[sea_orm(primary_key)]
    pub id: Uuid,

    #[sea_orm(column_name = "coupon_id")]
    pub coupon_id: i64,

    #[sea_orm(column_name = "order_id")]
    pub order_id: String,

    #[sea_orm(column_name = "discount_amount")]
    pub discount_amount: Decimal,

    #[sea_orm(column_name = "applied_at")]
    pub applied_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
