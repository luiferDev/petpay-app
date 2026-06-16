//! Coupon model for SeaORM

use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "coupons")]
pub struct Model {
    #[sea_orm(column_name = "id")]
    #[sea_orm(primary_key)]
    pub id: i64,

    #[sea_orm(column_name = "code", unique)]
    pub code: String,

    #[sea_orm(column_name = "discount_type")]
    pub discount_type: String,

    #[sea_orm(column_name = "discount_value")]
    pub discount_value: Decimal,

    #[sea_orm(column_name = "min_order_amount")]
    pub min_order_amount: Option<Decimal>,

    #[sea_orm(column_name = "valid_from")]
    pub valid_from: DateTimeUtc,

    #[sea_orm(column_name = "valid_until")]
    pub valid_until: DateTimeUtc,

    #[sea_orm(column_name = "max_uses")]
    pub max_uses: Option<i32>,

    #[sea_orm(column_name = "current_uses")]
    pub current_uses: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
