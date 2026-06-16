//! Invoice repository implementation

use crate::domain::entities::{Invoice, InvoiceStatus};
use crate::domain::errors::DomainError;
use crate::ports::repository::InvoiceRepository;
use crate::infrastructure::database::models::invoice_model::{Entity as InvoiceEntity, Model as InvoiceModel, Column as InvoiceColumn};
use sea_orm::{DbConn, EntityTrait, ColumnTrait, QueryFilter};
use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

pub struct PostgresInvoiceRepository {
    db: DbConn,
}

impl PostgresInvoiceRepository {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
    
    fn to_domain(model: InvoiceModel) -> Invoice {
        let status = match model.status.to_uppercase().as_str() {
            "ISSUED" => InvoiceStatus::Issued,
            "SENT" => InvoiceStatus::Sent,
            "PAID" => InvoiceStatus::Paid,
            _ => InvoiceStatus::Issued,
        };
        
        Invoice {
            id: model.id,
            invoice_number: model.invoice_number,
            payment_id: model.payment_id,
            customer_id: model.customer_id,
            customer_name: model.customer_name,
            customer_email: model.customer_email,
            subtotal: model.subtotal,
            tax: model.tax,
            discount: model.discount,
            total: model.total,
            status,
            pdf_path: model.pdf_path,
            created_at: model.created_at.with_timezone(&Utc),
        }
    }
    
    fn to_active_model(invoice: &Invoice) -> crate::infrastructure::database::models::invoice_model::ActiveModel {
        let status_str = match invoice.status {
            InvoiceStatus::Issued => "ISSUED".to_string(),
            InvoiceStatus::Sent => "SENT".to_string(),
            InvoiceStatus::Paid => "PAID".to_string(),
        };
        
        crate::infrastructure::database::models::invoice_model::ActiveModel {
            id: sea_orm::ActiveValue::Set(invoice.id),
            invoice_number: sea_orm::ActiveValue::Set(invoice.invoice_number.clone()),
            payment_id: sea_orm::ActiveValue::Set(invoice.payment_id),
            customer_id: sea_orm::ActiveValue::Set(invoice.customer_id.clone()),
            customer_name: sea_orm::ActiveValue::Set(invoice.customer_name.clone()),
            customer_email: sea_orm::ActiveValue::Set(invoice.customer_email.clone()),
            subtotal: sea_orm::ActiveValue::Set(invoice.subtotal),
            tax: sea_orm::ActiveValue::Set(invoice.tax),
            discount: sea_orm::ActiveValue::Set(invoice.discount),
            total: sea_orm::ActiveValue::Set(invoice.total),
            status: sea_orm::ActiveValue::Set(status_str),
            pdf_path: sea_orm::ActiveValue::Set(invoice.pdf_path.clone()),
            created_at: sea_orm::ActiveValue::Set(invoice.created_at),
        }
    }
}

#[async_trait]
impl InvoiceRepository for PostgresInvoiceRepository {
    async fn create(&self, invoice: &Invoice) -> Result<Invoice, DomainError> {
        let active_model = Self::to_active_model(invoice);
        
        InvoiceEntity::insert(active_model)
            .exec(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(invoice.clone())
    }
    
    async fn find_by_id(&self, id: &str) -> Result<Option<Invoice>, DomainError> {
        let uuid = Uuid::parse_str(id)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        let result = InvoiceEntity::find_by_id(uuid)
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(result.map(Self::to_domain))
    }
    
    async fn find_by_payment_id(&self, payment_id: &str) -> Result<Option<Invoice>, DomainError> {
        let uuid = Uuid::parse_str(payment_id)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        let result = InvoiceEntity::find()
            .filter(InvoiceColumn::PaymentId.eq(uuid))
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(result.map(Self::to_domain))
    }
    
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Invoice>, DomainError> {
        let results = InvoiceEntity::find()
            .filter(InvoiceColumn::CustomerId.eq(customer_id))
            .all(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        let invoices: Vec<Invoice> = results
            .into_iter()
            .map(Self::to_domain)
            .collect();
        
        Ok(invoices)
    }
    
    async fn update(&self, invoice: &Invoice) -> Result<Invoice, DomainError> {
        let active_model = Self::to_active_model(invoice);
        
        InvoiceEntity::update(active_model)
            .exec(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(invoice.clone())
    }
}
