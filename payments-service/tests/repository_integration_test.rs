use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sea_orm::{
    ActiveValue, ColumnTrait, Database, DatabaseConnection, DbBackend, EntityTrait,
    QueryFilter, Statement,
};
use std::sync::Arc;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Testcontainers setup
// ---------------------------------------------------------------------------

async fn setup_test_db() -> (DatabaseConnection, testcontainers::Container<testcontainers::GenericImage>) {
    use testcontainers::{GenericImage, core::IntoContainerName};

    let container = GenericImage::new("postgres", "16-alpine")
        .with_env_var("POSTGRES_DB", "petpay_test")
        .with_env_var("POSTGRES_USER", "postgres")
        .with_env_var("POSTGRES_PASSWORD", "postgres")
        .start()
        .await
        .expect("Failed to start Postgres container. Ensure Docker is running.");

    let host_port = container.get_host_port_ipv4(5432);
    let url = format!(
        "postgresql://postgres:postgres@127.0.0.1:{}/petpay_test",
        host_port
    );

    let conn = Database::connect(&url)
        .await
        .expect("Failed to connect to Postgres");

    run_migrations(&conn).await.expect("Migration failed");

    (conn, container)
}

async fn run_migrations(db: &DatabaseConnection) -> Result<(), Box<dyn std::error::Error>> {
    // Run raw SQL from migration definitions

    // payment_model migration
    db.execute(Statement::from_string(
        DbBackend::Postgres,
        r#"
        CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY,
            order_id VARCHAR NOT NULL,
            customer_id VARCHAR NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR NOT NULL DEFAULT 'USD',
            method VARCHAR NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'PENDING',
            provider_payment_id VARCHAR,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        "#.to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)".to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)".to_string(),
    ))
    .await?;

    // invoice and invoice_items migration
    db.execute(Statement::from_string(
        DbBackend::Postgres,
        r#"
        CREATE TABLE IF NOT EXISTS invoices (
            id UUID PRIMARY KEY,
            invoice_number VARCHAR NOT NULL UNIQUE,
            payment_id UUID NOT NULL,
            customer_id VARCHAR NOT NULL,
            customer_name VARCHAR NOT NULL,
            customer_email VARCHAR NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tax DECIMAL(10,2) NOT NULL,
            discount DECIMAL(10,2) NOT NULL DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'ISSUED',
            pdf_path VARCHAR,
            created_at TIMESTAMPTZ NOT NULL
        )
        "#.to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id)".to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)".to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        r#"
        CREATE TABLE IF NOT EXISTS invoice_items (
            id UUID PRIMARY KEY,
            invoice_id UUID NOT NULL,
            description VARCHAR NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL
        )
        "#.to_string(),
    ))
    .await?;

    // coupon and applied_coupon migration
    db.execute(Statement::from_string(
        DbBackend::Postgres,
        r#"
        CREATE TABLE IF NOT EXISTS coupons (
            id BIGSERIAL PRIMARY KEY,
            code VARCHAR NOT NULL UNIQUE,
            discount_type VARCHAR NOT NULL,
            discount_value DECIMAL(10,2) NOT NULL,
            min_order_amount DECIMAL(10,2),
            valid_from TIMESTAMPTZ NOT NULL,
            valid_until TIMESTAMPTZ NOT NULL,
            max_uses INTEGER,
            current_uses INTEGER NOT NULL DEFAULT 0
        )
        "#.to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        r#"
        CREATE TABLE IF NOT EXISTS applied_coupons (
            id UUID PRIMARY KEY,
            coupon_id BIGINT NOT NULL,
            order_id VARCHAR NOT NULL,
            discount_amount DECIMAL(10,2) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL
        )
        "#.to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "CREATE INDEX IF NOT EXISTS idx_applied_coupons_order_id ON applied_coupons(order_id)".to_string(),
    ))
    .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn make_payment(
    order_id: &str,
    customer_id: &str,
    amount: Decimal,
    currency: &str,
    method: &str,
    status: &str,
) -> (Uuid, String, String, Decimal, String, String, String, Option<String>, DateTime<Utc>, DateTime<Utc>) {
    let id = Uuid::new_v4();
    let now = Utc::now();
    (id, order_id.to_string(), customer_id.to_string(), amount, currency.to_string(), method.to_string(), status.to_string(), None, now, now)
}

fn make_invoice(
    invoice_number: &str,
    payment_id: Uuid,
    customer_id: &str,
    customer_name: &str,
    customer_email: &str,
    subtotal: Decimal,
    tax: Decimal,
    total: Decimal,
    status: &str,
) -> (Uuid, String, Uuid, String, String, String, Decimal, Decimal, Decimal, Decimal, String, Option<String>, DateTime<Utc>) {
    let id = Uuid::new_v4();
    let now = Utc::now();
    (id, invoice_number.to_string(), payment_id, customer_id.to_string(), customer_name.to_string(), customer_email.to_string(), Decimal::ZERO, subtotal, tax, total, status.to_string(), None, now)
}

fn make_coupon(
    code: &str,
    discount_type: &str,
    discount_value: Decimal,
    valid_from: DateTime<Utc>,
    valid_until: DateTime<Utc>,
    max_uses: Option<i32>,
    min_order_amount: Option<Decimal>,
) -> (String, String, Decimal, Option<Decimal>, DateTime<Utc>, DateTime<Utc>, Option<i32>) {
    (code.to_string(), discount_type.to_string(), discount_value, min_order_amount, valid_from, valid_until, max_uses)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // =========================================================================
    // Payment Repository
    // =========================================================================

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_create_payment() {
        let (db, _container) = setup_test_db().await;

        let id = Uuid::new_v4();
        let now = Utc::now();

        let sql = r#"
            INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#;

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            [
                id.into(),
                "order_1".into(),
                "customer_1".into(),
                Decimal::new(10000, 2).into(),  // 100.00
                "USD".into(),
                "STRIPE".into(),
                "PENDING".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .expect("Failed to insert payment");

        // Verify by reading back
        let rows = db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM payments WHERE id = $1",
                [id.into()],
            ))
            .await
            .expect("Failed to query payment");

        assert_eq!(rows.len(), 1);
        let row = &rows[0];
        let order_id: String = row.try_get("", "order_id").unwrap();
        assert_eq!(order_id, "order_1");
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_find_payment_by_id() {
        let (db, _container) = setup_test_db().await;

        let id = Uuid::new_v4();
        let now = Utc::now();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                id.into(),
                "order_find".into(),
                "customer_find".into(),
                Decimal::new(5000, 2).into(),
                "USD".into(),
                "PAYPAL".into(),
                "COMPLETED".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM payments WHERE id = $1",
                [id.into()],
            ))
            .await
            .unwrap()
            .expect("Payment not found");

        let order_id: String = row.try_get("", "order_id").unwrap();
        let status: String = row.try_get("", "status").unwrap();
        let amount: Decimal = row.try_get("", "amount").unwrap();

        assert_eq!(order_id, "order_find");
        assert_eq!(status, "COMPLETED");
        assert_eq!(amount, Decimal::new(5000, 2));
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_find_payment_by_order_id() {
        let (db, _container) = setup_test_db().await;

        let id = Uuid::new_v4();
        let now = Utc::now();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                id.into(),
                "order_by_order_id".into(),
                "customer_ord".into(),
                Decimal::new(7500, 2).into(),
                "USD".into(),
                "CREDIT_CARD".into(),
                "PENDING".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        let rows = db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM payments WHERE order_id = $1",
                ["order_by_order_id".into()],
            ))
            .await
            .unwrap();

        assert_eq!(rows.len(), 1);
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_update_payment_status() {
        let (db, _container) = setup_test_db().await;

        let id = Uuid::new_v4();
        let now = Utc::now();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                id.into(),
                "order_update".into(),
                "customer_upd".into(),
                Decimal::new(20000, 2).into(),
                "USD".into(),
                "STRIPE".into(),
                "PENDING".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        let updated_now = Utc::now();
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3",
            ["COMPLETED".into(), updated_now.into(), id.into()],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT status FROM payments WHERE id = $1",
                [id.into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let status: String = row.try_get("", "status").unwrap();
        assert_eq!(status, "COMPLETED");
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_list_payments_by_customer() {
        let (db, _container) = setup_test_db().await;

        let customer_id = "customer_list_test";
        let now = Utc::now();

        for i in 0..3 {
            let id = Uuid::new_v4();
            db.execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
                [
                    id.into(),
                    format!("order_list_{}", i).into(),
                    customer_id.into(),
                    Decimal::new(1000 * (i + 1), 2).into(),
                    "USD".into(),
                    "STRIPE".into(),
                    "PENDING".into(),
                    now.into(),
                    now.into(),
                ],
            ))
            .await
            .unwrap();
        }

        let rows = db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at ASC",
                [customer_id.into()],
            ))
            .await
            .unwrap();

        assert_eq!(rows.len(), 3);
    }

    // =========================================================================
    // Invoice Repository
    // =========================================================================

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_create_invoice_with_items() {
        let (db, _container) = setup_test_db().await;

        let payment_id = Uuid::new_v4();
        let now = Utc::now();

        // Create a payment first (FK-like reference)
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                payment_id.into(),
                "order_inv".into(),
                "customer_inv".into(),
                Decimal::new(3000, 2).into(),
                "USD".into(),
                "STRIPE".into(),
                "COMPLETED".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        let invoice_id = Uuid::new_v4();
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO invoices (id, invoice_number, payment_id, customer_id, customer_name, customer_email, subtotal, tax, discount, total, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#,
            [
                invoice_id.into(),
                "INV-001".into(),
                payment_id.into(),
                "customer_inv".into(),
                "Test Customer".into(),
                "test@example.com".into(),
                Decimal::new(2500, 2).into(),
                Decimal::new(500, 2).into(),
                Decimal::ZERO.into(),
                Decimal::new(3000, 2).into(),
                "ISSUED".into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        // Create invoice items
        let item_id = Uuid::new_v4();
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            [
                item_id.into(),
                invoice_id.into(),
                "Pet grooming service".into(),
                2.into(),
                Decimal::new(1250, 2).into(),
                Decimal::new(2500, 2).into(),
            ],
        ))
        .await
        .unwrap();

        // Verify invoice exists
        let inv_row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM invoices WHERE id = $1",
                [invoice_id.into()],
            ))
            .await
            .unwrap()
            .unwrap();
        let inv_number: String = inv_row.try_get("", "invoice_number").unwrap();
        assert_eq!(inv_number, "INV-001");

        // Verify invoice items exist
        let item_rows = db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM invoice_items WHERE invoice_id = $1",
                [invoice_id.into()],
            ))
            .await
            .unwrap();
        assert_eq!(item_rows.len(), 1);
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_find_invoice_by_id() {
        let (db, _container) = setup_test_db().await;

        let payment_id = Uuid::new_v4();
        let invoice_id = Uuid::new_v4();
        let now = Utc::now();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                payment_id.into(),
                "order_inv_find".into(),
                "customer_inv".into(),
                Decimal::new(5000, 2).into(),
                "USD".into(),
                "STRIPE".into(),
                "COMPLETED".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO invoices (id, invoice_number, payment_id, customer_id, customer_name, customer_email, subtotal, tax, discount, total, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#,
            [
                invoice_id.into(),
                "INV-FIND-001".into(),
                payment_id.into(),
                "customer_find_inv".into(),
                "Finder".into(),
                "finder@test.com".into(),
                Decimal::new(4000, 2).into(),
                Decimal::new(800, 2).into(),
                Decimal::ZERO.into(),
                Decimal::new(4800, 2).into(),
                "SENT".into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM invoices WHERE id = $1",
                [invoice_id.into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let customer_name: String = row.try_get("", "customer_name").unwrap();
        let status: String = row.try_get("", "status").unwrap();
        assert_eq!(customer_name, "Finder");
        assert_eq!(status, "SENT");
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_find_invoices_by_customer_id() {
        let (db, _container) = setup_test_db().await;

        let payment_id = Uuid::new_v4();
        let now = Utc::now();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                payment_id.into(),
                "order_cust_inv".into(),
                "customer_list_inv".into(),
                Decimal::new(10000, 2).into(),
                "USD".into(),
                "STRIPE".into(),
                "COMPLETED".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        for i in 0..2 {
            let inv_id = Uuid::new_v4();
            db.execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"INSERT INTO invoices (id, invoice_number, payment_id, customer_id, customer_name, customer_email, subtotal, tax, discount, total, status, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#,
                [
                    inv_id.into(),
                    format!("INV-LIST-{:03}", i + 1).into(),
                    payment_id.into(),
                    "customer_list_inv".into(),
                    "List Customer".into(),
                    "list@test.com".into(),
                    Decimal::new(5000, 2).into(),
                    Decimal::new(1000, 2).into(),
                    Decimal::ZERO.into(),
                    Decimal::new(6000, 2).into(),
                    "ISSUED".into(),
                    now.into(),
                ],
            ))
            .await
            .unwrap();
        }

        let rows = db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM invoices WHERE customer_id = $1 ORDER BY created_at ASC",
                ["customer_list_inv".into()],
            ))
            .await
            .unwrap();

        assert_eq!(rows.len(), 2);
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_update_invoice_status() {
        let (db, _container) = setup_test_db().await;

        let payment_id = Uuid::new_v4();
        let invoice_id = Uuid::new_v4();
        let now = Utc::now();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO payments (id, order_id, customer_id, amount, currency, method, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            [
                payment_id.into(),
                "order_inv_upd".into(),
                "customer_upd_inv".into(),
                Decimal::new(3000, 2).into(),
                "USD".into(),
                "STRIPE".into(),
                "COMPLETED".into(),
                now.into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO invoices (id, invoice_number, payment_id, customer_id, customer_name, customer_email, subtotal, tax, discount, total, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#,
            [
                invoice_id.into(),
                "INV-UPD-001".into(),
                payment_id.into(),
                "customer_upd_inv".into(),
                "Update Tester".into(),
                "update@test.com".into(),
                Decimal::new(2500, 2).into(),
                Decimal::new(500, 2).into(),
                Decimal::ZERO.into(),
                Decimal::new(3000, 2).into(),
                "ISSUED".into(),
                now.into(),
            ],
        ))
        .await
        .unwrap();

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "UPDATE invoices SET status = $1 WHERE id = $2",
            ["PAID".into(), invoice_id.into()],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT status FROM invoices WHERE id = $1",
                [invoice_id.into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let status: String = row.try_get("", "status").unwrap();
        assert_eq!(status, "PAID");
    }

    // =========================================================================
    // Coupon Repository
    // =========================================================================

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_create_coupon() {
        let (db, _container) = setup_test_db().await;

        let now = Utc::now();
        let valid_until = now + chrono::Duration::days(30);

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, max_uses, current_uses)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
            [
                "SAVE10".into(),
                "PERCENTAGE".into(),
                Decimal::new(10, 0).into(),  // 10%
                Some(Decimal::new(5000, 2)).into(),  // min $50
                now.into(),
                valid_until.into(),
                Some(100).into(),
                0.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM coupons WHERE code = $1",
                ["SAVE10".into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let discount_value: Decimal = row.try_get("", "discount_value").unwrap();
        assert_eq!(discount_value, Decimal::new(10, 0));
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_find_coupon_by_code() {
        let (db, _container) = setup_test_db().await;

        let now = Utc::now();
        let valid_until = now + chrono::Duration::days(30);

        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, current_uses)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            [
                "WELCOME20".into(),
                "PERCENTAGE".into(),
                Decimal::new(20, 0).into(),
                now.into(),
                valid_until.into(),
                0.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM coupons WHERE code = $1",
                ["WELCOME20".into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let code: String = row.try_get("", "code").unwrap();
        let discount_type: String = row.try_get("", "discount_type").unwrap();
        assert_eq!(code, "WELCOME20");
        assert_eq!(discount_type, "PERCENTAGE");
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_validate_coupon_expiry() {
        let (db, _container) = setup_test_db().await;

        let now = Utc::now();
        let past = now - chrono::Duration::days(10);
        let expired = now - chrono::Duration::days(1);

        // Create an expired coupon
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, current_uses)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            [
                "EXPIRED10".into(),
                "FIXED".into(),
                Decimal::new(1000, 2).into(),  // $10
                past.into(),
                expired.into(),
                0.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM coupons WHERE code = $1",
                ["EXPIRED10".into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let valid_until: chrono::DateTime<Utc> = row.try_get("", "valid_until").unwrap();
        assert!(valid_until < Utc::now());
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_coupon_usage_limit() {
        let (db, _container) = setup_test_db().await;

        let now = Utc::now();
        let valid_until = now + chrono::Duration::days(30);

        // Create a coupon with max_uses = 5 that already has 5 uses
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, max_uses, current_uses)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
            [
                "LIMIT5".into(),
                "FIXED".into(),
                Decimal::new(500, 2).into(),
                now.into(),
                valid_until.into(),
                Some(5).into(),
                5.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM coupons WHERE code = $1",
                ["LIMIT5".into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let max_uses: Option<i32> = row.try_get("", "max_uses").unwrap();
        let current_uses: i32 = row.try_get("", "current_uses").unwrap();
        assert_eq!(max_uses, Some(5));
        assert_eq!(current_uses, 5);
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_coupon_minimum_order() {
        let (db, _container) = setup_test_db().await;

        let now = Utc::now();
        let valid_until = now + chrono::Duration::days(30);

        // Create a coupon with minimum order amount of $50
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, current_uses)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
            [
                "MIN50".into(),
                "PERCENTAGE".into(),
                Decimal::new(15, 0).into(),
                Some(Decimal::new(5000, 2)).into(),
                now.into(),
                valid_until.into(),
                0.into(),
            ],
        ))
        .await
        .unwrap();

        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT * FROM coupons WHERE code = $1",
                ["MIN50".into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let min_order: Option<Decimal> = row.try_get("", "min_order_amount").unwrap();
        assert_eq!(min_order, Some(Decimal::new(5000, 2)));
    }

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_increment_coupon_usage() {
        let (db, _container) = setup_test_db().await;

        let now = Utc::now();
        let valid_until = now + chrono::Duration::days(30);

        // Insert coupon
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, current_uses)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            [
                "INCREMENT_TEST".into(),
                "PERCENTAGE".into(),
                Decimal::new(10, 0).into(),
                now.into(),
                valid_until.into(),
                0.into(),
            ],
        ))
        .await
        .unwrap();

        // Increment usage
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "UPDATE coupons SET current_uses = current_uses + 1 WHERE code = $1",
            ["INCREMENT_TEST".into()],
        ))
        .await
        .unwrap();

        // Verify
        let row = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT current_uses FROM coupons WHERE code = $1",
                ["INCREMENT_TEST".into()],
            ))
            .await
            .unwrap()
            .unwrap();

        let current_uses: i32 = row.try_get("", "current_uses").unwrap();
        assert_eq!(current_uses, 1);
    }

    // =========================================================================
    // Migration Verification
    // =========================================================================

    #[tokio::test]
    #[ignore = "requires Docker for testcontainers"]
    async fn test_all_tables_created() {
        let (db, _container) = setup_test_db().await;

        let tables = [
            "payments",
            "invoices",
            "invoice_items",
            "coupons",
            "applied_coupons",
        ];

        for table in tables {
            let row = db
                .query_one(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) AS exists",
                    [table.into()],
                ))
                .await
                .unwrap();

            if let Some(r) = row {
                let exists: bool = r.try_get("", "exists").unwrap();
                assert!(exists, "Table '{}' should exist", table);
            } else {
                panic!("Could not verify table '{}'", table);
            }
        }
    }
}
