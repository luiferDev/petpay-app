package dto

import (
	"petpay/catalog-offers-service/internal/application/core"
	"time"
)

type CreateProductRequest struct {
	StoreProfileId uint64   `json:"storeProfileId" binding:"required"`
	CategoryId     uint64   `json:"categoryId" binding:"required"`
	Name           string   `json:"name" binding:"required"`
	Description    string   `json:"description"`
	Brand          string   `json:"brand"`
	Price          float64  `json:"price" binding:"required,gt=0"`
	DiscountPrice  float64  `json:"discountPrice"`
	StockQuantity  uint64   `json:"stockQuantity" binding:"required"`
	Sku            string   `json:"sku" binding:"required"`
	IsFeatured     bool     `json:"isFeatured"`
	ImageUrls      []string `json:"imageUrls"`
	Weight         float64  `json:"weight"`
	Dimensions     string   `json:"dimensions"`
}

type UpdateProductRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Brand         string   `json:"brand"`
	Price         float64  `json:"price"`
	DiscountPrice float64  `json:"discountPrice"`
	StockQuantity uint64   `json:"stockQuantity"`
	IsActive      *bool    `json:"isActive"`
	IsFeatured    *bool    `json:"isFeatured"`
	ImageUrls     []string `json:"imageUrls"`
	Weight        float64  `json:"weight"`
	Dimensions    string   `json:"dimensions"`
}

type ProductResponse struct {
	ID            uint              `json:"id"`
	StoreProfileId uint64           `json:"storeProfileId"`
	CategoryId    uint64            `json:"categoryId"`
	Name          string            `json:"name"`
	Description   string            `json:"description,omitempty"`
	Brand         string            `json:"brand,omitempty"`
	Price         float64           `json:"price"`
	DiscountPrice float64           `json:"discountPrice,omitempty"`
	StockQuantity uint64            `json:"stockQuantity"`
	Sku           string            `json:"sku"`
	IsActive      bool              `json:"isActive"`
	IsFeatured    bool              `json:"isFeatured"`
	ImageUrls     []string          `json:"imageUrls,omitempty"`
	Weight        float64           `json:"weight,omitempty"`
	Dimensions    string            `json:"dimensions,omitempty"`
	Category      *CategoryResponse `json:"category,omitempty"`
	CreatedAt     string            `json:"createdAt"`
	UpdatedAt     string            `json:"updatedAt"`
}

type CategoryResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

func CreateRequestToProduct(req *CreateProductRequest) *core.Product {
	return &core.Product{
		StoreProfileId: req.StoreProfileId,
		CategoryId:     req.CategoryId,
		Name:           req.Name,
		Description:    req.Description,
		Brand:          req.Brand,
		Price:          req.Price,
		DiscountPrice:  req.DiscountPrice,
		StockQuantity:  req.StockQuantity,
		Sku:            req.Sku,
		IsFeatured:     req.IsFeatured,
		ImageUrls:      req.ImageUrls,
		Weight:         req.Weight,
		Dimensions:     req.Dimensions,
		IsActive:       true,
	}
}

func ApplyUpdatesToProduct(product *core.Product, req *UpdateProductRequest) {
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.Brand != "" {
		product.Brand = req.Brand
	}
	if req.Price > 0 {
		product.Price = req.Price
	}
	if req.DiscountPrice > 0 {
		product.DiscountPrice = req.DiscountPrice
	}
	if req.StockQuantity > 0 {
		product.StockQuantity = req.StockQuantity
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}
	if req.IsFeatured != nil {
		product.IsFeatured = *req.IsFeatured
	}
	if req.ImageUrls != nil {
		product.ImageUrls = req.ImageUrls
	}
	if req.Weight > 0 {
		product.Weight = req.Weight
	}
	if req.Dimensions != "" {
		product.Dimensions = req.Dimensions
	}
}

func ProductToResponse(product *core.Product) *ProductResponse {
	if product == nil {
		return nil
	}
	var catResp *CategoryResponse
	if product.Category != nil {
		catResp = &CategoryResponse{
			ID:          product.Category.ID,
			Name:        product.Category.Name,
			Description: product.Category.Description,
		}
	}
	return &ProductResponse{
		ID:             product.ID,
		StoreProfileId: product.StoreProfileId,
		CategoryId:     product.CategoryId,
		Name:           product.Name,
		Description:    product.Description,
		Brand:          product.Brand,
		Price:          product.Price,
		DiscountPrice:  product.DiscountPrice,
		StockQuantity:  product.StockQuantity,
		Sku:            product.Sku,
		IsActive:       product.IsActive,
		IsFeatured:     product.IsFeatured,
		ImageUrls:      product.ImageUrls,
		Weight:         product.Weight,
		Dimensions:     product.Dimensions,
		Category:       catResp,
		CreatedAt:      product.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      product.UpdatedAt.Format(time.RFC3339),
	}
}

func ProductsToListResponse(products []*core.Product) []*ProductResponse {
	result := make([]*ProductResponse, len(products))
	for i, p := range products {
		result[i] = ProductToResponse(p)
	}
	return result
}
