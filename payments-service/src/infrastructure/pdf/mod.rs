//! PDF Invoice Generator

use crate::domain::entities::Invoice;
use printpdf::*;
use std::io::{BufWriter, Cursor};

pub struct PdfGenerator;

impl PdfGenerator {
    /// Generate PDF invoice and return bytes
    pub fn generate_invoice_pdf(invoice: &Invoice) -> Result<Vec<u8>, anyhow::Error> {
        // Create a new PDF document
        let mut doc = PdfDocument::new(&format!("Invoice {}", invoice.invoice_number));

        // Use built-in fonts - no external font files needed
        let font_helvetica = PdfFontHandle::Builtin(BuiltinFont::Helvetica);
        let font_helvetica_bold = PdfFontHandle::Builtin(BuiltinFont::HelveticaBold);

        // Build page content operations using the new printpdf 0.9 API
        let mut page_contents = vec![];

        // Title
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(270.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica_bold.clone(),
            size: Pt(24.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("INVOICE".to_string())],
        });
        page_contents.push(Op::AddLineBreak);

        // Invoice number
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(255.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica.clone(),
            size: Pt(12.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(format!(
                "Invoice #: {}",
                invoice.invoice_number
            ))],
        });
        page_contents.push(Op::AddLineBreak);

        // Date
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(245.0)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(format!(
                "Date: {}",
                invoice.created_at.format("%Y-%m-%d")
            ))],
        });
        page_contents.push(Op::AddLineBreak);

        // Bill To header
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(220.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica_bold.clone(),
            size: Pt(12.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("Bill To:".to_string())],
        });
        page_contents.push(Op::AddLineBreak);

        // Customer name
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(210.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica.clone(),
            size: Pt(12.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(invoice.customer_name.clone())],
        });
        page_contents.push(Op::AddLineBreak);

        // Customer email
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(200.0)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(invoice.customer_email.clone())],
        });
        page_contents.push(Op::AddLineBreak);

        // Line items header
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(180.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica_bold.clone(),
            size: Pt(12.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("Description".to_string())],
        });
        page_contents.push(Op::AddLineBreak);
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(150.0), Mm(180.0)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("Amount".to_string())],
        });
        page_contents.push(Op::AddLineBreak);

        // Separator line
        page_contents.push(Op::SetOutlineThickness { pt: Pt(0.5) });
        page_contents.push(Op::DrawLine {
            line: Line {
                points: vec![
                    LinePoint {
                        p: Point::new(Mm(20.0), Mm(175.0)),
                        bezier: false,
                    },
                    LinePoint {
                        p: Point::new(Mm(190.0), Mm(175.0)),
                        bezier: false,
                    },
                ],
                is_closed: false,
            },
        });
        page_contents.push(Op::AddLineBreak);

        // Subtotal
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(120.0), Mm(140.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica.clone(),
            size: Pt(12.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("Subtotal:".to_string())],
        });
        page_contents.push(Op::AddLineBreak);
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(160.0), Mm(140.0)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(format!("${:.2}", invoice.subtotal))],
        });
        page_contents.push(Op::AddLineBreak);

        // Tax
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(120.0), Mm(130.0)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("Tax:".to_string())],
        });
        page_contents.push(Op::AddLineBreak);
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(160.0), Mm(130.0)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(format!("${:.2}", invoice.tax))],
        });
        page_contents.push(Op::AddLineBreak);

        // Discount if any
        let final_y = if invoice.discount > rust_decimal::Decimal::ZERO {
            page_contents.push(Op::SetTextCursor {
                pos: Point::new(Mm(120.0), Mm(120.0)),
            });
            page_contents.push(Op::ShowText {
                items: vec![TextItem::Text("Discount:".to_string())],
            });
            page_contents.push(Op::AddLineBreak);
            page_contents.push(Op::SetTextCursor {
                pos: Point::new(Mm(160.0), Mm(120.0)),
            });
            page_contents.push(Op::ShowText {
                items: vec![TextItem::Text(format!("-${:.2}", invoice.discount))],
            });
            page_contents.push(Op::AddLineBreak);
            105.0
        } else {
            115.0
        };

        // Total
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(120.0), Mm(final_y)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica_bold.clone(),
            size: Pt(14.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("TOTAL:".to_string())],
        });
        page_contents.push(Op::AddLineBreak);
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(160.0), Mm(final_y)),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(format!("${:.2}", invoice.total))],
        });
        page_contents.push(Op::AddLineBreak);

        // Payment status
        let status_text = match invoice.status {
            crate::domain::entities::InvoiceStatus::Issued => "Status: ISSUED",
            crate::domain::entities::InvoiceStatus::Sent => "Status: SENT",
            crate::domain::entities::InvoiceStatus::Paid => "Status: PAID",
        };
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(80.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica.clone(),
            size: Pt(12.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text(status_text.to_string())],
        });
        page_contents.push(Op::AddLineBreak);

        // Footer
        page_contents.push(Op::SetTextCursor {
            pos: Point::new(Mm(20.0), Mm(30.0)),
        });
        page_contents.push(Op::SetFont {
            font: font_helvetica.clone(),
            size: Pt(10.0),
        });
        page_contents.push(Op::ShowText {
            items: vec![TextItem::Text("Thank you for your business!".to_string())],
        });
        page_contents.push(Op::AddLineBreak);

        // Create page with content (A4: 210mm x 297mm)
        let page1 = PdfPage::new(Mm(210.0), Mm(297.0), page_contents);

        // Save to bytes - save() takes 2 arguments in printpdf 0.9
        let mut warnings = Vec::new();
        let pdf_bytes: Vec<u8> = doc
            .with_pages(vec![page1])
            .save(&PdfSaveOptions::default(), &mut warnings);

        Ok(pdf_bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::InvoiceStatus;
    use chrono::Utc;
    use rust_decimal_macros::dec;

    #[test]
    fn test_generate_pdf() {
        let invoice = Invoice {
            id: uuid::Uuid::new_v4(),
            invoice_number: "INV-2026-001".to_string(),
            payment_id: uuid::Uuid::new_v4(),
            customer_id: "cust_123".to_string(),
            customer_name: "John Doe".to_string(),
            customer_email: "john@example.com".to_string(),
            subtotal: dec!(100.00),
            tax: dec!(10.00),
            discount: dec!(0.00),
            total: dec!(110.00),
            status: InvoiceStatus::Issued,
            pdf_path: None,
            created_at: Utc::now(),
        };

        let result = PdfGenerator::generate_invoice_pdf(&invoice);
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert!(!bytes.is_empty());

        // Check PDF header
        assert!(bytes.starts_with(b"%PDF"));
    }
}
