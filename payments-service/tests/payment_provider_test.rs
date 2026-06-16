//! Payment provider tests

#[cfg(test)]
mod tests {
    use payments_service::ports::services::payment_provider::{PaymentProvider, PaymentError, PaymentResult};
    use rust_decimal::Decimal;
    use async_trait::async_trait;

    // Mock payment provider for testing
    #[derive(Debug, Clone)]
    struct MockPaymentProvider {
        should_fail: bool,
    }

    #[async_trait]
    impl PaymentProvider for MockPaymentProvider {
        async fn create_payment(
            &self,
            amount: Decimal,
            currency: &str,
            _token: &str,
        ) -> Result<PaymentResult, PaymentError> {
            if self.should_fail {
                return Err(PaymentError {
                    code: "PAYMENT_FAILED".to_string(),
                    message: "Mock payment failure".to_string(),
                });
            }

            Ok(PaymentResult {
                provider_payment_id: format!("mock_pi_{}", amount),
                status: "succeeded".to_string(),
            })
        }

        async fn verify_payment(
            &self,
            provider_payment_id: &str,
        ) -> Result<String, PaymentError> {
            if self.should_fail {
                return Err(PaymentError {
                    code: "VERIFICATION_FAILED".to_string(),
                    message: "Mock verification failure".to_string(),
                });
            }

            Ok("succeeded".to_string())
        }

        async fn refund_payment(
            &self,
            provider_payment_id: &str,
            _amount: Option<Decimal>,
        ) -> Result<String, PaymentError> {
            if self.should_fail {
                return Err(PaymentError {
                    code: "REFUND_FAILED".to_string(),
                    message: "Mock refund failure".to_string(),
                });
            }

            Ok(format!("refunded_{}", provider_payment_id))
        }
    }

    #[tokio::test]
    async fn test_mock_payment_success() {
        let provider = MockPaymentProvider { should_fail: false };
        
        let result = provider.create_payment(
            Decimal::from(1000),
            "USD",
            "tok_test",
        ).await;

        assert!(result.is_ok());
        let payment_result = result.unwrap();
        assert_eq!(payment_result.status, "succeeded");
        assert!(payment_result.provider_payment_id.contains("1000"));
    }

    #[tokio::test]
    async fn test_mock_payment_failure() {
        let provider = MockPaymentProvider { should_fail: true };
        
        let result = provider.create_payment(
            Decimal::from(1000),
            "USD",
            "tok_test",
        ).await;

        assert!(result.is_err());
        let error = result.unwrap_err();
        assert_eq!(error.code, "PAYMENT_FAILED");
    }

    #[tokio::test]
    async fn test_mock_verify_payment_success() {
        let provider = MockPaymentProvider { should_fail: false };
        
        let result = provider.verify_payment("pi_123").await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "succeeded");
    }

    #[tokio::test]
    async fn test_mock_verify_payment_failure() {
        let provider = MockPaymentProvider { should_fail: true };
        
        let result = provider.verify_payment("pi_123").await;

        assert!(result.is_err());
        let error = result.unwrap_err();
        assert_eq!(error.code, "VERIFICATION_FAILED");
    }

    #[tokio::test]
    async fn test_mock_refund_success() {
        let provider = MockPaymentProvider { should_fail: false };
        
        let result = provider.refund_payment("pi_123", Some(Decimal::from(500))).await;

        assert!(result.is_ok());
        assert!(result.unwrap().contains("refunded_pi_123"));
    }

    #[tokio::test]
    async fn test_mock_refund_failure() {
        let provider = MockPaymentProvider { should_fail: true };
        
        let result = provider.refund_payment("pi_123", Some(Decimal::from(500))).await;

        assert!(result.is_err());
        let error = result.unwrap_err();
        assert_eq!(error.code, "REFUND_FAILED");
    }

    #[tokio::test]
    async fn test_payment_with_different_currencies() {
        let provider = MockPaymentProvider { should_fail: false };
        
        // Test USD
        let usd_result = provider.create_payment(Decimal::from(100), "USD", "tok_usd").await;
        assert!(usd_result.is_ok());
        
        // Test EUR
        let eur_result = provider.create_payment(Decimal::from(100), "EUR", "tok_eur").await;
        assert!(eur_result.is_ok());
        
        // Test MXN
        let mxn_result = provider.create_payment(Decimal::from(100), "MXN", "tok_mxn").await;
        assert!(mxn_result.is_ok());
    }
}
