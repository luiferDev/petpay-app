//! Payment repository implementation

use crate::domain::entities::{Payment, PaymentMethod, PaymentStatus};
use crate::domain::errors::DomainError;
use crate::ports::repository::PaymentRepository;
use crate::infrastructure::database::models::payment_model::{Entity as PaymentEntity, Model as PaymentModel, Column as PaymentColumn};
use sea_orm::{DbConn, EntityTrait, ColumnTrait, QueryFilter};
use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

pub struct PostgresPaymentRepository {
    db: DbConn,
}

impl PostgresPaymentRepository {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
    
    fn to_domain(model: PaymentModel) -> Payment {
        let method = match model.method.to_uppercase().as_str() {
            "STRIPE" => PaymentMethod::Stripe,
            "PAYPAL" => PaymentMethod::PayPal,
            "CREDIT_CARD" => PaymentMethod::CreditCard,
            _ => PaymentMethod::Stripe,
        };
        
        let status = match model.status.to_uppercase().as_str() {
            "PENDING" => PaymentStatus::Pending,
            "COMPLETED" => PaymentStatus::Completed,
            "FAILED" => PaymentStatus::Failed,
            "REFUNDED" => PaymentStatus::Refunded,
            _ => PaymentStatus::Pending,
        };
        
        Payment {
            id: model.id,
            order_id: model.order_id,
            customer_id: model.customer_id,
            amount: model.amount,
            currency: model.currency,
            method,
            status,
            provider_payment_id: model.provider_payment_id,
            created_at: model.created_at.with_timezone(&Utc),
            updated_at: model.updated_at.with_timezone(&Utc),
        }
    }
    
    fn to_active_model(payment: &Payment) -> crate::infrastructure::database::models::payment_model::ActiveModel {
        let method_str = match payment.method {
            PaymentMethod::Stripe => "STRIPE".to_string(),
            PaymentMethod::PayPal => "PAYPAL".to_string(),
            PaymentMethod::CreditCard => "CREDIT_CARD".to_string(),
        };
        
        let status_str = match payment.status {
            PaymentStatus::Pending => "PENDING".to_string(),
            PaymentStatus::Completed => "COMPLETED".to_string(),
            PaymentStatus::Failed => "FAILED".to_string(),
            PaymentStatus::Refunded => "REFUNDED".to_string(),
        };
        
        crate::infrastructure::database::models::payment_model::ActiveModel {
            id: sea_orm::ActiveValue::Set(payment.id),
            order_id: sea_orm::ActiveValue::Set(payment.order_id.clone()),
            customer_id: sea_orm::ActiveValue::Set(payment.customer_id.clone()),
            amount: sea_orm::ActiveValue::Set(payment.amount),
            currency: sea_orm::ActiveValue::Set(payment.currency.clone()),
            method: sea_orm::ActiveValue::Set(method_str),
            status: sea_orm::ActiveValue::Set(status_str),
            provider_payment_id: sea_orm::ActiveValue::Set(payment.provider_payment_id.clone()),
            created_at: sea_orm::ActiveValue::Set(payment.created_at),
            updated_at: sea_orm::ActiveValue::Set(payment.updated_at),
        }
    }
}

#[async_trait]
impl PaymentRepository for PostgresPaymentRepository {
    async fn create(&self, payment: &Payment) -> Result<Payment, DomainError> {
        let active_model = Self::to_active_model(payment);
        
        PaymentEntity::insert(active_model)
            .exec(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(payment.clone())
    }
    
    async fn find_by_id(&self, id: &str) -> Result<Option<Payment>, DomainError> {
        let uuid = Uuid::parse_str(id)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        let result = PaymentEntity::find_by_id(uuid)
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(result.map(Self::to_domain))
    }
    
    async fn find_by_order_id(&self, order_id: &str) -> Result<Option<Payment>, DomainError> {
        // Use filter to query by order_id directly in the database
        let result = PaymentEntity::find()
            .filter(PaymentColumn::OrderId.eq(order_id.to_string()))
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(result.map(Self::to_domain))
    }
    
    async fn find_by_customer(&self, customer_id: &str) -> Result<Vec<Payment>, DomainError> {
        // Use filter to query by customer_id directly in the database
        let results = PaymentEntity::find()
            .filter(PaymentColumn::CustomerId.eq(customer_id.to_string()))
            .all(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        let payments: Vec<Payment> = results
            .into_iter()
            .map(Self::to_domain)
            .collect();
        
        Ok(payments)
    }
    
    async fn update(&self, payment: &Payment) -> Result<Payment, DomainError> {
        let active_model = Self::to_active_model(payment);
        
        PaymentEntity::update(active_model)
            .exec(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(payment.clone())
    }
}
