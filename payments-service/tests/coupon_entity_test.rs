//! Coupon entity unit tests

#[cfg(test)]
mod tests {
    use chrono::{Duration, Utc};
    use payments_service::domain::entities::{AppliedCoupon, Coupon, CouponError, DiscountType};
    use rust_decimal::Decimal;

    fn create_valid_coupon() -> Coupon {
        Coupon {
            id: 1,
            code: "SAVE10".to_string(),
            discount_type: DiscountType::Percentage,
            discount_value: Decimal::from(10),
            min_order_amount: None,
            valid_from: Utc::now() - Duration::days(1),
            valid_until: Utc::now() + Duration::days(30),
            max_uses: None,
            current_uses: 0,
        }
    }

    #[test]
    fn test_coupon_is_valid() {
        let coupon = create_valid_coupon();
        let result = coupon.is_valid(Decimal::from(100));
        assert!(result.is_ok());
    }

    #[test]
    fn test_coupon_expired() {
        let mut coupon = create_valid_coupon();
        coupon.valid_until = Utc::now() - Duration::days(1);

        let result = coupon.is_valid(Decimal::from(100));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CouponError::Expired);
    }

    #[test]
    fn test_coupon_not_yet_valid() {
        let mut coupon = create_valid_coupon();
        coupon.valid_from = Utc::now() + Duration::days(1);

        let result = coupon.is_valid(Decimal::from(100));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CouponError::NotYetValid);
    }

    #[test]
    fn test_coupon_usage_limit_reached() {
        let mut coupon = create_valid_coupon();
        coupon.max_uses = Some(5);
        coupon.current_uses = 5;

        let result = coupon.is_valid(Decimal::from(100));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CouponError::UsageLimitReached);
    }

    #[test]
    fn test_coupon_below_minimum_order() {
        let mut coupon = create_valid_coupon();
        coupon.min_order_amount = Some(Decimal::from(200));

        let result = coupon.is_valid(Decimal::from(100));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CouponError::BelowMinimumOrder);
    }

    #[test]
    fn test_percentage_discount_calculation() {
        let coupon = Coupon {
            id: 1,
            code: "SAVE20".to_string(),
            discount_type: DiscountType::Percentage,
            discount_value: Decimal::from(20),
            min_order_amount: None,
            valid_from: Utc::now() - Duration::days(1),
            valid_until: Utc::now() + Duration::days(30),
            max_uses: None,
            current_uses: 0,
        };

        let discount = coupon.calculate_discount(Decimal::from(100));
        assert_eq!(discount, Decimal::from(20)); // 20% of 100 = 20
    }

    #[test]
    fn test_fixed_discount_calculation() {
        let coupon = Coupon {
            id: 1,
            code: "FLAT50".to_string(),
            discount_type: DiscountType::Fixed,
            discount_value: Decimal::from(50),
            min_order_amount: None,
            valid_from: Utc::now() - Duration::days(1),
            valid_until: Utc::now() + Duration::days(30),
            max_uses: None,
            current_uses: 0,
        };

        let discount = coupon.calculate_discount(Decimal::from(100));
        assert_eq!(discount, Decimal::from(50));
    }

    #[test]
    fn test_fixed_discount_does_not_exceed_order() {
        let coupon = Coupon {
            id: 1,
            code: "FLAT200".to_string(),
            discount_type: DiscountType::Fixed,
            discount_value: Decimal::from(200),
            min_order_amount: None,
            valid_from: Utc::now() - Duration::days(1),
            valid_until: Utc::now() + Duration::days(30),
            max_uses: None,
            current_uses: 0,
        };

        // When discount > order amount, the discount is capped at order amount
        let discount = coupon.calculate_discount(Decimal::from(100));
        assert_eq!(discount, Decimal::from(100));
    }

    #[test]
    fn test_applied_coupon_creation() {
        let applied = AppliedCoupon::new(1, "order_123".to_string(), Decimal::from(10));

        assert_eq!(applied.coupon_id, 1);
        assert_eq!(applied.order_id, "order_123");
        assert_eq!(applied.discount_amount, Decimal::from(10));
        assert!(!applied.id.to_string().is_empty());
    }
}
