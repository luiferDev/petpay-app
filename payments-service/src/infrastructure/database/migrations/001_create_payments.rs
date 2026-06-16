//! Database migration: Create payments table
//! Run with: sea-orm-cli migrate

use sea_orm_migration::prelude::*;
use async_trait::async_trait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create payments table
        manager
            .create_table(
                Table::create()
                    .table(Payments::Table)
                    .col(
                        ColumnDef::new(Payments::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Payments::OrderId).string().not_null())
                    .col(ColumnDef::new(Payments::CustomerId).string().not_null())
                    .col(ColumnDef::new(Payments::Amount).decimal().not_null())
                    .col(ColumnDef::new(Payments::Currency).string().not_null().default("USD"))
                    .col(ColumnDef::new(Payments::Method).string().not_null())
                    .col(ColumnDef::new(Payments::Status).string().not_null().default("PENDING"))
                    .col(ColumnDef::new(Payments::ProviderPaymentId).string().null())
                    .col(ColumnDef::new(Payments::CreatedAt).timestamp().not_null())
                    .col(ColumnDef::new(Payments::UpdatedAt).timestamp().not_null())
                    .to_owned(),
            )
            .await?;

        // Create index on order_id
        manager
            .create_index(
                Index::create()
                    .table(Payments::Table)
                    .col(Payments::OrderId)
                    .name("idx_payments_order_id")
                    .to_owned(),
            )
            .await?;

        // Create index on customer_id
        manager
            .create_index(
                Index::create()
                    .table(Payments::Table)
                    .col(Payments::CustomerId)
                    .name("idx_payments_customer_id")
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Payments::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Payments {
    Table,
    Id,
    OrderId,
    CustomerId,
    Amount,
    Currency,
    Method,
    Status,
    ProviderPaymentId,
    CreatedAt,
    UpdatedAt,
}
