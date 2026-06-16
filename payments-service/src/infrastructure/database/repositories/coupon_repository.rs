//! Coupon repository implementation

use crate::domain::entities::{Coupon, DiscountType};
use crate::domain::errors::DomainError;
use crate::ports::repository::CouponRepository;
use crate::infrastructure::database::models::coupon_model::{Entity as CouponEntity, Model as CouponModel, Column as CouponColumn};
use sea_orm::{DbConn, EntityTrait, ColumnTrait, QueryFilter};
use async_trait::async_trait;
use chrono::Utc;

pub struct PostgresCouponRepository {
    db: DbConn,
}

impl PostgresCouponRepository {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
    
    fn to_domain(model: CouponModel) -> Coupon {
        let discount_type = match model.discount_type.to_uppercase().as_str() {
            "PERCENTAGE" => DiscountType::Percentage,
            "FIXED" => DiscountType::Fixed,
            _ => DiscountType::Percentage,
        };
        
        Coupon {
            id: model.id,
            code: model.code,
            discount_type,
            discount_value: model.discount_value,
            min_order_amount: model.min_order_amount,
            valid_from: model.valid_from.with_timezone(&Utc),
            valid_until: model.valid_until.with_timezone(&Utc),
            max_uses: model.max_uses,
            current_uses: model.current_uses,
        }
    }
}

#[async_trait]
impl CouponRepository for PostgresCouponRepository {
    async fn find_by_code(&self, code: &str) -> Result<Option<Coupon>, DomainError> {
        let result = CouponEntity::find()
            .filter(CouponColumn::Code.eq(code.to_uppercase()))
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(result.map(Self::to_domain))
    }
    
    async fn increment_uses(&self, id: i64) -> Result<(), DomainError> {
        let result = CouponEntity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?
            .ok_or_else(|| DomainError::ValidationError("Coupon not found".to_string()))?;
        
        let mut active_model: crate::infrastructure::database::models::coupon_model::ActiveModel = result.into();
        let current_uses = active_model.current_uses.take().unwrap_or(0);
        active_model.current_uses = sea_orm::ActiveValue::Set(current_uses + 1);
        
        CouponEntity::update(active_model)
            .exec(&self.db)
            .await
            .map_err(|e| DomainError::InternalError(e.to_string()))?;
        
        Ok(())
    }
}
