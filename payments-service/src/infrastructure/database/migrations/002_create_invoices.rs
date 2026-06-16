//! Database migration: Create invoices table
//! Run with: sea-orm-cli migrate

use sea_orm_migration::prelude::*;
use async_trait::async_trait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create invoices table
        manager
            .create_table(
                Table::create()
                    .table(Invoices::Table)
                    .col(
                        ColumnDef::new(Invoices::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Invoices::InvoiceNumber)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Invoices::PaymentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Invoices::CustomerId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Invoices::CustomerName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Invoices::CustomerEmail)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Invoices::Subtotal)
                            .decimal()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Invoices::Tax).decimal().not_null())
                    .col(
                        ColumnDef::new(Invoices::Discount)
                            .decimal()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Invoices::Total)
                            .decimal()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Invoices::Status)
                            .string()
                            .not_null()
                            .default("ISSUED"),
                    )
                    .col(ColumnDef::new(Invoices::PdfPath).string().null())
                    .col(
                        ColumnDef::new(Invoices::CreatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on payment_id
        manager
            .create_index(
                Index::create()
                    .table(Invoices::Table)
                    .col(Invoices::PaymentId)
                    .name("idx_invoices_payment_id")
                    .to_owned(),
            )
            .await?;

        // Create index on customer_id
        manager
            .create_index(
                Index::create()
                    .table(Invoices::Table)
                    .col(Invoices::CustomerId)
                    .name("idx_invoices_customer_id")
                    .to_owned(),
            )
            .await?;

        // Create invoice_items table
        manager
            .create_table(
                Table::create()
                    .table(InvoiceItems::Table)
                    .col(
                        ColumnDef::new(InvoiceItems::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(InvoiceItems::InvoiceId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InvoiceItems::Description)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InvoiceItems::Quantity)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InvoiceItems::UnitPrice)
                            .decimal()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InvoiceItems::Total)
                            .decimal()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(InvoiceItems::Table).to_owned())
            .await?;
        
        manager
            .drop_table(Table::drop().table(Invoices::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Invoices {
    Table,
    Id,
    InvoiceNumber,
    PaymentId,
    CustomerId,
    CustomerName,
    CustomerEmail,
    Subtotal,
    Tax,
    Discount,
    Total,
    Status,
    PdfPath,
    CreatedAt,
}

#[derive(Iden)]
enum InvoiceItems {
    Table,
    Id,
    InvoiceId,
    Description,
    Quantity,
    UnitPrice,
    Total,
}
