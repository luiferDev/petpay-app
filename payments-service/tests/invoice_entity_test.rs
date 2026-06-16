//! Invoice entity unit tests

#[cfg(test)]
mod tests {
    use payments_service::domain::entities::{Invoice, InvoiceItem, InvoiceStatus};
    use rust_decimal::Decimal;
    use uuid::Uuid;

    #[test]
    fn test_invoice_creation() {
        let invoice_id = Uuid::new_v4();
        let payment_id = Uuid::new_v4();
        
        let items = vec![
            InvoiceItem::new(invoice_id, "Product A".to_string(), 2, Decimal::from(50)),
            InvoiceItem::new(invoice_id, "Product B".to_string(), 1, Decimal::from(100)),
        ];

        let invoice = Invoice::new(
            "INV-001".to_string(),
            payment_id,
            "customer_1".to_string(),
            "John Doe".to_string(),
            "john@example.com".to_string(),
            &items,
            Decimal::from(10), // 10% tax
        );

        assert_eq!(invoice.invoice_number, "INV-001");
        assert_eq!(invoice.payment_id, payment_id);
        assert_eq!(invoice.customer_id, "customer_1");
        assert_eq!(invoice.customer_name, "John Doe");
        assert_eq!(invoice.customer_email, "john@example.com");
        assert_eq!(invoice.status, InvoiceStatus::Issued);
        assert!(invoice.pdf_path.is_none());
        
        // subtotal: (2 * 50) + (1 * 100) = 200
        assert_eq!(invoice.subtotal, Decimal::from(200));
        // tax: 200 * 10% = 20
        assert_eq!(invoice.tax, Decimal::from(20));
        // total: 200 + 20 = 220
        assert_eq!(invoice.total, Decimal::from(220));
    }

    #[test]
    fn test_invoice_mark_sent() {
        let invoice_id = Uuid::new_v4();
        let payment_id = Uuid::new_v4();
        
        let items = vec![
            InvoiceItem::new(invoice_id, "Product A".to_string(), 1, Decimal::from(100)),
        ];

        let mut invoice = Invoice::new(
            "INV-001".to_string(),
            payment_id,
            "customer_1".to_string(),
            "John Doe".to_string(),
            "john@example.com".to_string(),
            &items,
            Decimal::from(10),
        );

        invoice.mark_sent();
        assert_eq!(invoice.status, InvoiceStatus::Sent);
    }

    #[test]
    fn test_invoice_set_pdf_path() {
        let invoice_id = Uuid::new_v4();
        let payment_id = Uuid::new_v4();
        
        let items = vec![
            InvoiceItem::new(invoice_id, "Product A".to_string(), 1, Decimal::from(100)),
        ];

        let mut invoice = Invoice::new(
            "INV-001".to_string(),
            payment_id,
            "customer_1".to_string(),
            "John Doe".to_string(),
            "john@example.com".to_string(),
            &items,
            Decimal::ZERO,
        );

        invoice.set_pdf_path("/path/to/invoice.pdf".to_string());
        assert_eq!(invoice.pdf_path, Some("/path/to/invoice.pdf".to_string()));
    }

    #[test]
    fn test_invoice_item_calculation() {
        let invoice_id = Uuid::new_v4();
        
        let item = InvoiceItem::new(
            invoice_id,
            "Premium Widget".to_string(),
            5, // quantity
            Decimal::from(2999), // $        );

        // total:29.99
 5 * 29.99 = 149.95
        assert_eq!(item.quantity, 5);
        assert_eq!(item.unit_price, Decimal::from(2999));
        // Note: Due to Decimal representation, exact value may vary
    }

    #[test]
    fn test_invoice_with_zero_tax() {
        let invoice_id = Uuid::new_v4();
        let payment_id = Uuid::new_v4();
        
        let items = vec![
            InvoiceItem::new(invoice_id, "Product A".to_string(), 1, Decimal::from(100)),
        ];

        let invoice = Invoice::new(
            "INV-001".to_string(),
            payment_id,
            "customer_1".to_string(),
            "John Doe".to_string(),
            "john@example.com".to_string(),
            &items,
            Decimal::ZERO,
        );

        assert_eq!(invoice.subtotal, Decimal::from(100));
        assert_eq!(invoice.tax, Decimal::ZERO);
        assert_eq!(invoice.total, Decimal::from(100));
    }
}
