//! Payment entity unit tests

#[cfg(test)]
mod tests {
    use payments_service::domain::entities::{Payment, PaymentMethod, PaymentStatus};
    use rust_decimal::Decimal;
    use uuid::Uuid;

    #[test]
    fn test_payment_creation() {
        let payment = Payment::new(
            "order_123".to_string(),
            "customer_456".to_string(),
            Decimal::from(1000),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );

        assert_eq!(payment.order_id, "order_123");
        assert_eq!(payment.customer_id, "customer_456");
        assert_eq!(payment.amount, Decimal::from(1000));
        assert_eq!(payment.currency, "USD");
        assert_eq!(payment.method, PaymentMethod::Stripe);
        assert_eq!(payment.status, PaymentStatus::Pending);
        assert!(payment.provider_payment_id.is_none());
        assert!(!payment.id.to_string().is_empty());
    }

    #[test]
    fn test_payment_mark_completed() {
        let mut payment = Payment::new(
            "order_123".to_string(),
            "customer_456".to_string(),
            Decimal::from(1000),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );

        payment.mark_completed("pi_abc123".to_string());

        assert_eq!(payment.status, PaymentStatus::Completed);
        assert_eq!(payment.provider_payment_id, Some("pi_abc123".to_string()));
    }

    #[test]
    fn test_payment_mark_failed() {
        let mut payment = Payment::new(
            "order_123".to_string(),
            "customer_456".to_string(),
            Decimal::from(1000),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );

        payment.mark_failed();

        assert_eq!(payment.status, PaymentStatus::Failed);
    }

    #[test]
    fn test_payment_methods() {
        let stripe = Payment::new(
            "order_1".to_string(),
            "customer_1".to_string(),
            Decimal::from(100),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );
        assert_eq!(stripe.method, PaymentMethod::Stripe);

        let paypal = Payment::new(
            "order_2".to_string(),
            "customer_2".to_string(),
            Decimal::from(200),
            "USD".to_string(),
            PaymentMethod::PayPal,
        );
        assert_eq!(paypal.method, PaymentMethod::PayPal);

        let credit_card = Payment::new(
            "order_3".to_string(),
            "customer_3".to_string(),
            Decimal::from(300),
            "USD".to_string(),
            PaymentMethod::CreditCard,
        );
        assert_eq!(credit_card.method, PaymentMethod::CreditCard);
    }

    #[test]
    fn test_payment_status_default() {
        let payment = Payment::new(
            "order_123".to_string(),
            "customer_456".to_string(),
            Decimal::from(1000),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );

        assert_eq!(payment.status, PaymentStatus::Pending);
    }

    #[test]
    fn test_payment_uuid_unique() {
        let payment1 = Payment::new(
            "order_1".to_string(),
            "customer_1".to_string(),
            Decimal::from(100),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );

        let payment2 = Payment::new(
            "order_2".to_string(),
            "customer_2".to_string(),
            Decimal::from(200),
            "USD".to_string(),
            PaymentMethod::Stripe,
        );

        assert_ne!(payment1.id, payment2.id);
    }
}
