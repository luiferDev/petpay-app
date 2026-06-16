//! Invoice handlers

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    response::Response,
};

use super::AppState;
use crate::application::queries::{GetInvoiceQuery, ListInvoicesQuery, GetInvoicePdfQuery};
use crate::application::dto::{InvoiceResponse, InvoiceListResponse};
use crate::middleware::auth::Claims;

pub async fn get_invoice(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<String>,
) -> Result<Json<InvoiceResponse>, StatusCode> {
    let customer_id = claims.email;  // Use JWT claims instead of placeholder
    
    let query = GetInvoiceQuery::new(state.invoice_repo.clone());
    
    match query.execute(&id, &customer_id).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Get invoice failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}

pub async fn list_invoices(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<InvoiceListResponse>, StatusCode> {
    let customer_id = claims.email;  // Use JWT claims instead of placeholder
    
    let query = ListInvoicesQuery::new(state.invoice_repo.clone());
    
    match query.execute(&customer_id).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("List invoices failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}

pub async fn download_invoice_pdf(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<String>,
) -> Result<Response, StatusCode> {
    let customer_id = claims.email;  // Use JWT claims instead of placeholder
    let pdf_storage_path = "/app/pdfs".to_string();
    
    let query = GetInvoicePdfQuery::new(
        state.invoice_repo.clone(),
        pdf_storage_path,
    );
    
    match query.execute(&id, &customer_id).await {
        Ok(pdf_bytes) => {
            let body = axum::body::Body::from(pdf_bytes);
            Response::builder()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", format!("attachment; filename=\"invoice-{}.pdf\"", id))
                .body(body)
                .map_err(|e| {
                    tracing::error!("Failed to build response: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })
        }
        Err(e) => {
            tracing::error!("Download invoice PDF failed: {:?}", e);
            Err(StatusCode::from_u16(e.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        }
    }
}
