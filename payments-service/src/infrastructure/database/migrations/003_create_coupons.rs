//! Database migration: Create coupons table
//! Run with: sea-orm-cli migrate

use sea_orm_migration::prelude::*;
use async_trait::async_trait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create coupons table
        manager
            .create_table(
                Table::create()
                    .table(Coupons::Table)
                    .col(
                        ColumnDef::new(Coupons::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Coupons::Code)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Coupons::DiscountType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Coupons::DiscountValue)
                            .decimal()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Coupons::MinOrderAmount)
                            .decimal()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Coupons::ValidFrom)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Coupons::ValidUntil)
                            .timestamp()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Coupons::MaxUses).integer().null())
                    .col(
                        ColumnDef::new(Coupons::CurrentUses)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        // Create applied_coupons table
        manager
            .create_table(
                Table::create()
                    .table(AppliedCoupons::Table)
                    .col(
                        ColumnDef::new(AppliedCoupons::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AppliedCoupons::CouponId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AppliedCoupons::OrderId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AppliedCoupons::DiscountAmount)
                            .decimal()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AppliedCoupons::AppliedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on applied_coupons order_id
        manager
            .create_index(
                Index::create()
                    .table(AppliedCoupons::Table)
                    .col(AppliedCoupons::OrderId)
                    .name("idx_applied_coupons_order_id")
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AppliedCoupons::Table).to_owned())
            .await?;
        
        manager
            .drop_table(Table::drop().table(Coupons::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Coupons {
    Table,
    Id,
    Code,
    DiscountType,
    DiscountValue,
    MinOrderAmount,
    ValidFrom,
    ValidUntil,
    MaxUses,
    CurrentUses,
}

#[derive(Iden)]
enum AppliedCoupons {
    Table,
    Id,
    CouponId,
    OrderId,
    DiscountAmount,
    AppliedAt,
}
